import Foundation

/// Lossless recursive JSON value used at the executable-runtime boundary.
/// Values are never stringified implicitly; invalid non-finite numbers fail
/// closed before a transition mutates runtime state.
public enum ReaderUIJSONValue: Sendable, Equatable, Codable {
    case null
    case bool(Bool)
    case number(Double)
    case string(String)
    case array([ReaderUIJSONValue])
    case object([String: ReaderUIJSONValue])

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self = .null
        } else if let value = try? container.decode(Bool.self) {
            self = .bool(value)
        } else if let value = try? container.decode(Double.self) {
            guard value.isFinite else {
                throw DecodingError.dataCorruptedError(in: container, debugDescription: "JSON numbers must be finite")
            }
            self = .number(value)
        } else if let value = try? container.decode(String.self) {
            self = .string(value)
        } else if let value = try? container.decode([ReaderUIJSONValue].self) {
            self = .array(value)
        } else if let value = try? container.decode([String: ReaderUIJSONValue].self) {
            self = .object(value)
        } else {
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Unsupported JSON value")
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .null:
            try container.encodeNil()
        case .bool(let value):
            try container.encode(value)
        case .number(let value):
            guard value.isFinite else {
                throw EncodingError.invalidValue(
                    value,
                    EncodingError.Context(codingPath: encoder.codingPath, debugDescription: "JSON numbers must be finite")
                )
            }
            try container.encode(value)
        case .string(let value):
            try container.encode(value)
        case .array(let value):
            try container.encode(value)
        case .object(let value):
            try container.encode(value)
        }
    }

    public var stringValue: String? {
        guard case .string(let value) = self else { return nil }
        return value
    }

    public var boolValue: Bool? {
        guard case .bool(let value) = self else { return nil }
        return value
    }

    public var doubleValue: Double? {
        guard case .number(let value) = self else { return nil }
        return value
    }

    /// Numeric strings remain accepted during migration, while the emitted
    /// runtime payload uses a real JSON number.
    public var intValue: Int? {
        switch self {
        case .number(let value):
            guard value.isFinite,
                  value.rounded(.towardZero) == value,
                  value >= Double(Int.min),
                  value <= Double(Int.max) else { return nil }
            return Int(value)
        case .string(let value):
            return Int(value)
        default:
            return nil
        }
    }

    public func validated(path: String = "$") throws -> ReaderUIJSONValue {
        switch self {
        case .number(let value) where !value.isFinite:
            throw ReaderUIRuntimeFailure(code: "INVALID_JSON_PAYLOAD", message: "\(path) must contain a finite JSON number")
        case .array(let values):
            return .array(try values.enumerated().map { index, value in
                try value.validated(path: "\(path)[\(index)]")
            })
        case .object(let values):
            return .object(try values.reduce(into: [:]) { result, pair in
                result[pair.key] = try pair.value.validated(path: "\(path).\(pair.key)")
            })
        default:
            return self
        }
    }
}

public typealias ReaderUIJSONPayload = [String: ReaderUIJSONValue]
public typealias ReaderUIJSONResult = ReaderUIJSONPayload

public struct ReaderUITypedResultContract: Sendable, Equatable {
    public let effectKind: String
    public let schema: ReaderUIJSONValue

    public init(effectKind: String, schema: ReaderUIJSONValue) {
        self.effectKind = effectKind
        self.schema = schema
    }
}

public struct ReaderUITypedPayloadContract: Sendable, Equatable {
    public let dispatchTarget: String
    public let operation: String
    public let descriptorAction: String
    public let descriptorValue: String?
    public let descriptorCoreSequence: [String]
    public let descriptorHostRequest: String?
    public let schema: ReaderUIJSONValue
    public let resultSchemas: [String: ReaderUITypedResultContract]

    public init(
        dispatchTarget: String,
        operation: String,
        descriptorAction: String,
        descriptorValue: String?,
        descriptorCoreSequence: [String],
        descriptorHostRequest: String?,
        schema: ReaderUIJSONValue,
        resultSchemas: [String: ReaderUITypedResultContract]
    ) {
        self.dispatchTarget = dispatchTarget
        self.operation = operation
        self.descriptorAction = descriptorAction
        self.descriptorValue = descriptorValue
        self.descriptorCoreSequence = descriptorCoreSequence
        self.descriptorHostRequest = descriptorHostRequest
        self.schema = schema
        self.resultSchemas = resultSchemas
    }
}

public struct ReaderUILegacyPayloadProjection: Sendable, Equatable {
    public let payload: [String: String]
    public let isComplete: Bool
}

public extension Dictionary where Key == String, Value == ReaderUIJSONValue {
    static func readerUIStrings(_ values: [String: String]) -> ReaderUIJSONPayload {
        values.mapValues(ReaderUIJSONValue.string)
    }

    func readerUIValidated() throws -> ReaderUIJSONPayload {
        try reduce(into: [:]) { result, pair in
            result[pair.key] = try pair.value.validated(path: "payload.\(pair.key)")
        }
    }

    /// Compatibility view for legacy Host code. It is nil as soon as any
    /// value is not a JSON string, preventing silent type erasure.
    var readerUILegacyStringPayload: [String: String]? {
        var result: [String: String] = [:]
        for (key, value) in self {
            guard let string = value.stringValue else { return nil }
            result[key] = string
        }
        return result
    }

    /// Compatibility-only scalar projection. Objects, arrays and null are
    /// omitted rather than stringified; `isComplete` makes that omission
    /// explicit. Canonical consumers must use the original JSON payload.
    var readerUILegacyScalarProjection: ReaderUILegacyPayloadProjection {
        var projected: [String: String] = [:]
        var isComplete = true
        for (key, value) in self {
            switch value {
            case .string(let string):
                projected[key] = string
            case .bool(let bool):
                projected[key] = bool ? "true" : "false"
            case .number(let number):
                if number.rounded(.towardZero) == number,
                   number >= Double(Int64.min), number <= Double(Int64.max) {
                    projected[key] = String(Int64(number))
                } else {
                    projected[key] = String(number)
                }
            case .null, .array, .object:
                isComplete = false
            }
        }
        return ReaderUILegacyPayloadProjection(payload: projected, isComplete: isComplete)
    }
}

extension ReaderUIJSONValue: ExpressibleByNilLiteral {
    public init(nilLiteral: ()) { self = .null }
}

extension ReaderUIJSONValue: ExpressibleByBooleanLiteral {
    public init(booleanLiteral value: Bool) { self = .bool(value) }
}

extension ReaderUIJSONValue: ExpressibleByIntegerLiteral {
    public init(integerLiteral value: Int) { self = .number(Double(value)) }
}

extension ReaderUIJSONValue: ExpressibleByFloatLiteral {
    public init(floatLiteral value: Double) { self = .number(value) }
}

extension ReaderUIJSONValue: ExpressibleByStringLiteral {
    public init(stringLiteral value: String) { self = .string(value) }
}

extension ReaderUIJSONValue: ExpressibleByArrayLiteral {
    public init(arrayLiteral elements: ReaderUIJSONValue...) { self = .array(elements) }
}

extension ReaderUIJSONValue: ExpressibleByDictionaryLiteral {
    public init(dictionaryLiteral elements: (String, ReaderUIJSONValue)...) {
        self = .object(Dictionary(uniqueKeysWithValues: elements))
    }
}
