import Foundation

private let readerUISafeIntegerLimit = 9_007_199_254_740_991.0

@discardableResult
public func validateReaderUITypedPayload(
    event: String,
    payload: ReaderUIJSONPayload
) throws -> ReaderUITypedPayloadContract? {
    guard let contract = GeneratedRuntimeTypedPayloadContracts.byEvent[event] else { return nil }
    try validateTypedPayloadSchema(contract.schema, value: .object(payload), path: "payload")
    return contract
}

@discardableResult
public func validateReaderUITypedResult(
    event: String,
    effectType: String,
    result: ReaderUIJSONResult
) throws -> ReaderUITypedResultContract {
    guard let contract = GeneratedRuntimeTypedPayloadContracts.byEvent[event] else {
        throw ReaderUIRuntimeFailure(code: "INVALID_TYPED_CONTRACT", message: "No typed contract for \(event)")
    }
    guard let resultContract = contract.resultSchemas[effectType] else {
        throw ReaderUIRuntimeFailure(
            code: "UNDECLARED_TYPED_RESULT",
            message: "\(event) does not declare a result for \(effectType)"
        )
    }
    do {
        try validateTypedPayloadSchema(resultContract.schema, value: .object(result), path: "result")
    } catch let failure as ReaderUIRuntimeFailure where failure.code == "INVALID_TYPED_PAYLOAD" {
        throw ReaderUIRuntimeFailure(code: "INVALID_TYPED_RESULT", message: failure.message)
    }
    return resultContract
}

private func invalidTypedPayload(_ path: String, _ message: String) -> ReaderUIRuntimeFailure {
    ReaderUIRuntimeFailure(code: "INVALID_TYPED_PAYLOAD", message: "\(path) \(message)")
}

private func validateTypedJSONValue(_ value: ReaderUIJSONValue, path: String) throws {
    switch value {
    case .number(let number):
        guard number.isFinite,
              number.rounded(.towardZero) != number || abs(number) <= readerUISafeIntegerLimit else {
            throw invalidTypedPayload(path, "must contain only finite numbers and IEEE-754 safe integers")
        }
    case .array(let values):
        for (index, item) in values.enumerated() {
            try validateTypedJSONValue(item, path: "\(path)[\(index)]")
        }
    case .object(let object):
        for (key, item) in object {
            try validateTypedJSONValue(item, path: "\(path).\(key)")
        }
    default:
        break
    }
}

private func schemaObject(_ schema: ReaderUIJSONValue, path: String) throws -> ReaderUIJSONPayload {
    guard case .object(let object) = schema else {
        throw ReaderUIRuntimeFailure(code: "INVALID_TYPED_CONTRACT", message: "\(path) schema must be an object")
    }
    return object
}

private func validateTypedPayloadSchema(
    _ rawSchema: ReaderUIJSONValue,
    value: ReaderUIJSONValue,
    path: String
) throws {
    let schema = try schemaObject(rawSchema, path: path)
    if value == .null {
        if schema["nullable"]?.boolValue == true { return }
        throw invalidTypedPayload(path, "must not be null")
    }
    if case .array(let branches)? = schema["oneOf"] {
        var accepted = 0
        for branch in branches {
            do {
                try validateTypedPayloadSchema(branch, value: value, path: path)
                accepted += 1
            } catch let failure as ReaderUIRuntimeFailure where failure.code == "INVALID_TYPED_PAYLOAD" {
                continue
            }
        }
        guard accepted == 1 else {
            throw invalidTypedPayload(path, "must match exactly one schema variant (matched \(accepted))")
        }
        return
    }
    guard let type = schema["type"]?.stringValue else {
        throw ReaderUIRuntimeFailure(code: "INVALID_TYPED_CONTRACT", message: "\(path) schema type is missing")
    }

    switch type {
    case "object":
        guard case .object(let object) = value else { throw invalidTypedPayload(path, "must be an object") }
        let properties: ReaderUIJSONPayload
        if case .object(let declared)? = schema["properties"] { properties = declared } else { properties = [:] }
        if case .array(let required)? = schema["required"] {
            for field in required.compactMap(\.stringValue) where object[field] == nil {
                throw invalidTypedPayload("\(path).\(field)", "is required")
            }
        }
        if schema["additionalProperties"]?.boolValue == false {
            for field in object.keys where properties[field] == nil {
                throw invalidTypedPayload("\(path).\(field)", "is unknown")
            }
        } else if case .object? = schema["additionalProperties"],
                  let additionalSchema = schema["additionalProperties"] {
            for field in object.keys where properties[field] == nil {
                try validateTypedPayloadSchema(additionalSchema, value: object[field]!, path: "\(path).\(field)")
            }
        }
        for (field, childSchema) in properties {
            if let child = object[field] {
                try validateTypedPayloadSchema(childSchema, value: child, path: "\(path).\(field)")
            }
        }
        if case .array(let constraints)? = schema["constraints"] {
            for constraintValue in constraints {
                let constraint = try schemaObject(constraintValue, path: path)
                switch constraint["kind"]?.stringValue {
                case "nonBlankWhen":
                    guard let field = constraint["field"]?.stringValue,
                          let whenField = constraint["whenField"]?.stringValue else { continue }
                    if object[whenField]?.boolValue == constraint["equals"]?.boolValue,
                       object[field]?.stringValue?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty != false {
                        throw invalidTypedPayload("\(path).\(field)", "must be non-blank for this variant")
                    }
                case "booleanAnyTrue":
                    guard case .array(let fields)? = constraint["fields"] else { continue }
                    let defaults: ReaderUIJSONPayload
                    if case .object(let values)? = constraint["defaults"] { defaults = values } else { defaults = [:] }
                    let anyTrue = fields.compactMap(\.stringValue).contains { field in
                        (object[field] ?? defaults[field])?.boolValue == true
                    }
                    if !anyTrue {
                        throw invalidTypedPayload(path, "requires one target scope to be true")
                    }
                case "validRegexWhen":
                    guard let field = constraint["field"]?.stringValue,
                          let flagField = constraint["flagField"]?.stringValue else { continue }
                    let enabled = object[flagField]?.boolValue ?? constraint["default"]?.boolValue ?? false
                    if enabled, let pattern = object[field]?.stringValue {
                        do { _ = try NSRegularExpression(pattern: pattern) }
                        catch { throw invalidTypedPayload("\(path).\(field)", "must be a valid regular expression") }
                    }
                case "stringAnyNonBlank":
                    guard case .array(let fields)? = constraint["fields"] else { continue }
                    let anyNonBlank = fields.compactMap(\.stringValue).contains { field in
                        object[field]?.stringValue?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false
                    }
                    if !anyNonBlank {
                        throw invalidTypedPayload(path, "requires one string field to be non-blank")
                    }
                default:
                    throw ReaderUIRuntimeFailure(code: "INVALID_TYPED_CONTRACT", message: "\(path) has an unsupported constraint")
                }
            }
        }
        return
    case "array":
        guard case .array(let array) = value else { throw invalidTypedPayload(path, "must be an array") }
        if let minimum = schema["minItems"]?.intValue, array.count < minimum {
            throw invalidTypedPayload(path, "must contain at least \(minimum) items")
        }
        if let maximum = schema["maxItems"]?.intValue, array.count > maximum {
            throw invalidTypedPayload(path, "must contain at most \(maximum) items")
        }
        guard let items = schema["items"] else {
            throw ReaderUIRuntimeFailure(code: "INVALID_TYPED_CONTRACT", message: "\(path) array schema has no items")
        }
        for (index, item) in array.enumerated() {
            try validateTypedPayloadSchema(items, value: item, path: "\(path)[\(index)]")
        }
        return
    case "string":
        guard let string = value.stringValue else { throw invalidTypedPayload(path, "must be a string") }
        if let minimum = schema["minLength"]?.intValue, string.count < minimum {
            throw invalidTypedPayload(path, "must contain at least \(minimum) characters")
        }
        if let maximum = schema["maxLength"]?.intValue, string.count > maximum {
            throw invalidTypedPayload(path, "must contain at most \(maximum) characters")
        }
        if schema["nonBlank"]?.boolValue == true,
           string.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            throw invalidTypedPayload(path, "must be non-blank")
        }
        if let pattern = schema["pattern"]?.stringValue {
            let regex: NSRegularExpression
            do { regex = try NSRegularExpression(pattern: pattern) }
            catch {
                throw ReaderUIRuntimeFailure(code: "INVALID_TYPED_CONTRACT", message: "\(path) has an invalid schema pattern")
            }
            let range = NSRange(string.startIndex..<string.endIndex, in: string)
            if regex.firstMatch(in: string, range: range) == nil {
                throw invalidTypedPayload(path, "does not match its required pattern")
            }
        }
    case "integer":
        guard case .number(let number) = value,
              number.isFinite,
              number.rounded(.towardZero) == number,
              abs(number) <= readerUISafeIntegerLimit else {
            throw invalidTypedPayload(path, "must be an IEEE-754 safe integer")
        }
    case "number":
        guard case .number(let number) = value, number.isFinite else {
            throw invalidTypedPayload(path, "must be a finite number")
        }
    case "boolean":
        guard value.boolValue != nil else { throw invalidTypedPayload(path, "must be a boolean") }
    case "json":
        try validateTypedJSONValue(value, path: path)
        return
    default:
        throw ReaderUIRuntimeFailure(code: "INVALID_TYPED_CONTRACT", message: "\(path) has unsupported schema type \(type)")
    }

    if let constant = schema["const"], constant != value {
        throw invalidTypedPayload(path, "does not equal its required constant")
    }
    if case .array(let allowed)? = schema["enum"], !allowed.contains(value) {
        throw invalidTypedPayload(path, "is not an allowed enum value")
    }
    if let minimum = schema["minimum"]?.doubleValue,
       let number = value.doubleValue, number < minimum {
        throw invalidTypedPayload(path, "must be >= \(minimum)")
    }
    if let maximum = schema["maximum"]?.doubleValue,
       let number = value.doubleValue, number > maximum {
        throw invalidTypedPayload(path, "must be <= \(maximum)")
    }
}
