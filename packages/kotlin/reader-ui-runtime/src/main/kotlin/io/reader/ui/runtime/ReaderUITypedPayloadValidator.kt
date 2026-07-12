package io.reader.ui.runtime

import java.math.BigDecimal
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.intOrNull

private val readerUISafeIntegerLimit = BigDecimal("9007199254740991")

fun validateReaderUITypedPayload(
    event: String,
    payload: ReaderUIJSONPayload
): ReaderUITypedPayloadContract? {
    val contract = GeneratedRuntimeTypedPayloadContracts.byEvent[event] ?: return null
    validateTypedPayloadSchema(contract.schema, JsonObject(payload), "payload")
    return contract
}

fun validateReaderUITypedResult(
    event: String,
    effectType: String,
    result: ReaderUIJSONResult
): ReaderUITypedResultContract {
    val contract = GeneratedRuntimeTypedPayloadContracts.byEvent[event]
        ?: throw ReaderUIRuntimeException("INVALID_TYPED_CONTRACT", "No typed contract for $event")
    val resultContract = contract.resultSchemas[effectType]
        ?: throw ReaderUIRuntimeException("UNDECLARED_TYPED_RESULT", "$event does not declare a result for $effectType")
    try {
        validateTypedPayloadSchema(resultContract.schema, JsonObject(result), "result")
    } catch (failure: ReaderUIRuntimeException) {
        if (failure.code == "INVALID_TYPED_PAYLOAD") {
            throw ReaderUIRuntimeException("INVALID_TYPED_RESULT", failure.message ?: "invalid typed result")
        }
        throw failure
    }
    return resultContract
}

private fun invalidTypedPayload(path: String, message: String): Nothing =
    throw ReaderUIRuntimeException("INVALID_TYPED_PAYLOAD", "$path $message")

private fun validateTypedJSONValue(value: JsonElement, path: String) {
    when (value) {
        is JsonObject -> value.forEach { (key, item) -> validateTypedJSONValue(item, "$path.$key") }
        is JsonArray -> value.forEachIndexed { index, item -> validateTypedJSONValue(item, "$path[$index]") }
        is JsonPrimitive -> if (!value.isString) {
            val decimal = value.content.toBigDecimalOrNull() ?: return
            if (decimal.stripTrailingZeros().scale() <= 0 && decimal.abs() > readerUISafeIntegerLimit) {
                invalidTypedPayload(path, "must contain only finite numbers and IEEE-754 safe integers")
            }
        }
        else -> Unit
    }
}

private fun schemaObject(schema: JsonElement, path: String): JsonObject = schema as? JsonObject
    ?: throw ReaderUIRuntimeException("INVALID_TYPED_CONTRACT", "$path schema must be an object")

private fun JsonObject.string(key: String): String? =
    (this[key] as? JsonPrimitive)?.takeIf { it.isString }?.content

private fun validateTypedPayloadSchema(rawSchema: JsonElement, value: JsonElement, path: String) {
    val schema = schemaObject(rawSchema, path)
    if (value === JsonNull) {
        if ((schema["nullable"] as? JsonPrimitive)?.booleanOrNull == true) return
        invalidTypedPayload(path, "must not be null")
    }
    (schema["oneOf"] as? JsonArray)?.let { branches ->
        var accepted = 0
        branches.forEach { branch ->
            try {
                validateTypedPayloadSchema(branch, value, path)
                accepted += 1
            } catch (error: ReaderUIRuntimeException) {
                if (error.code != "INVALID_TYPED_PAYLOAD") throw error
            }
        }
        if (accepted != 1) invalidTypedPayload(path, "must match exactly one schema variant (matched $accepted)")
        return
    }
    val type = schema.string("type")
        ?: throw ReaderUIRuntimeException("INVALID_TYPED_CONTRACT", "$path schema type is missing")
    when (type) {
        "object" -> {
            val target = value as? JsonObject ?: invalidTypedPayload(path, "must be an object")
            val properties = schema["properties"] as? JsonObject ?: JsonObject(emptyMap())
            (schema["required"] as? JsonArray).orEmpty().forEach { item ->
                val field = (item as? JsonPrimitive)?.contentOrNull ?: return@forEach
                if (!target.containsKey(field)) invalidTypedPayload("$path.$field", "is required")
            }
            if ((schema["additionalProperties"] as? JsonPrimitive)?.booleanOrNull == false) {
                target.keys.forEach { field ->
                    if (!properties.containsKey(field)) invalidTypedPayload("$path.$field", "is unknown")
                }
            } else if (schema["additionalProperties"] is JsonObject) {
                val additionalSchema = schema.getValue("additionalProperties")
                target.forEach { (field, child) ->
                    if (!properties.containsKey(field)) validateTypedPayloadSchema(additionalSchema, child, "$path.$field")
                }
            }
            properties.forEach { (field, childSchema) ->
                target[field]?.let { validateTypedPayloadSchema(childSchema, it, "$path.$field") }
            }
            (schema["constraints"] as? JsonArray).orEmpty().forEach { constraintElement ->
                val constraint = schemaObject(constraintElement, path)
                when (constraint.string("kind")) {
                    "nonBlankWhen" -> {
                        val field = constraint.string("field") ?: return@forEach
                        val whenField = constraint.string("whenField") ?: return@forEach
                        val expected = (constraint["equals"] as? JsonPrimitive)?.booleanOrNull
                        if ((target[whenField] as? JsonPrimitive)?.booleanOrNull == expected) {
                            val text = (target[field] as? JsonPrimitive)?.takeIf { it.isString }?.content
                            if (text.isNullOrBlank()) invalidTypedPayload("$path.$field", "must be non-blank for this variant")
                        }
                    }
                    "booleanAnyTrue" -> {
                        val fields = constraint["fields"] as? JsonArray ?: return@forEach
                        val defaults = constraint["defaults"] as? JsonObject ?: JsonObject(emptyMap())
                        val anyTrue = fields.any { item ->
                            val field = (item as? JsonPrimitive)?.contentOrNull ?: return@any false
                            ((target[field] ?: defaults[field]) as? JsonPrimitive)?.booleanOrNull == true
                        }
                        if (!anyTrue) invalidTypedPayload(path, "requires one target scope to be true")
                    }
                    "validRegexWhen" -> {
                        val field = constraint.string("field") ?: return@forEach
                        val flagField = constraint.string("flagField") ?: return@forEach
                        val enabled = (target[flagField] as? JsonPrimitive)?.booleanOrNull
                            ?: (constraint["default"] as? JsonPrimitive)?.booleanOrNull
                            ?: false
                        if (enabled) {
                            val pattern = (target[field] as? JsonPrimitive)?.takeIf { it.isString }?.content ?: return@forEach
                            try { Regex(pattern) } catch (_: IllegalArgumentException) {
                                invalidTypedPayload("$path.$field", "must be a valid regular expression")
                            }
                        }
                    }
                    "stringAnyNonBlank" -> {
                        val fields = constraint["fields"] as? JsonArray ?: return@forEach
                        val anyNonBlank = fields.any { item ->
                            val field = (item as? JsonPrimitive)?.contentOrNull ?: return@any false
                            (target[field] as? JsonPrimitive)?.takeIf { it.isString }?.content?.isNotBlank() == true
                        }
                        if (!anyNonBlank) invalidTypedPayload(path, "requires one string field to be non-blank")
                    }
                    else -> throw ReaderUIRuntimeException("INVALID_TYPED_CONTRACT", "$path has an unsupported constraint")
                }
            }
            return
        }
        "array" -> {
            val array = value as? JsonArray ?: invalidTypedPayload(path, "must be an array")
            val minimum = (schema["minItems"] as? JsonPrimitive)?.intOrNull
            if (minimum != null && array.size < minimum) invalidTypedPayload(path, "must contain at least $minimum items")
            val items = schema["items"]
                ?: throw ReaderUIRuntimeException("INVALID_TYPED_CONTRACT", "$path array schema has no items")
            array.forEachIndexed { index, item -> validateTypedPayloadSchema(items, item, "$path[$index]") }
            return
        }
        "string" -> {
            val string = (value as? JsonPrimitive)?.takeIf { it.isString }?.content
                ?: invalidTypedPayload(path, "must be a string")
            val minimum = (schema["minLength"] as? JsonPrimitive)?.intOrNull
            if (minimum != null && string.length < minimum) invalidTypedPayload(path, "must contain at least $minimum characters")
            val maximum = (schema["maxLength"] as? JsonPrimitive)?.intOrNull
            if (maximum != null && string.length > maximum) invalidTypedPayload(path, "must contain at most $maximum characters")
            if ((schema["nonBlank"] as? JsonPrimitive)?.booleanOrNull == true && string.isBlank()) {
                invalidTypedPayload(path, "must be non-blank")
            }
            schema.string("pattern")?.let { pattern ->
                val regex = try { Regex(pattern) } catch (_: IllegalArgumentException) {
                    throw ReaderUIRuntimeException("INVALID_TYPED_CONTRACT", "$path has an invalid schema pattern")
                }
                if (!regex.containsMatchIn(string)) invalidTypedPayload(path, "does not match its required pattern")
            }
        }
        "integer" -> {
            val primitive = (value as? JsonPrimitive)?.takeUnless { it.isString }
                ?: invalidTypedPayload(path, "must be an IEEE-754 safe integer")
            val decimal = primitive.content.toBigDecimalOrNull()
                ?: invalidTypedPayload(path, "must be an IEEE-754 safe integer")
            if (decimal.stripTrailingZeros().scale() > 0 || decimal.abs() > readerUISafeIntegerLimit) {
                invalidTypedPayload(path, "must be an IEEE-754 safe integer")
            }
        }
        "number" -> {
            val number = (value as? JsonPrimitive)?.takeUnless { it.isString }?.doubleOrNull
            if (number == null || !number.isFinite()) invalidTypedPayload(path, "must be a finite number")
        }
        "boolean" -> if ((value as? JsonPrimitive)?.takeUnless { it.isString }?.booleanOrNull == null) {
            invalidTypedPayload(path, "must be a boolean")
        }
        "json" -> {
            validateTypedJSONValue(value, path)
            return
        }
        else -> throw ReaderUIRuntimeException("INVALID_TYPED_CONTRACT", "$path has unsupported schema type $type")
    }

    schema["const"]?.let { if (it != value) invalidTypedPayload(path, "does not equal its required constant") }
    (schema["enum"] as? JsonArray)?.let { if (value !in it) invalidTypedPayload(path, "is not an allowed enum value") }
    val number = (value as? JsonPrimitive)?.takeUnless { it.isString }?.content?.toBigDecimalOrNull()
    val minimum = (schema["minimum"] as? JsonPrimitive)?.content?.toBigDecimalOrNull()
    val maximum = (schema["maximum"] as? JsonPrimitive)?.content?.toBigDecimalOrNull()
    if (number != null && minimum != null && number < minimum) invalidTypedPayload(path, "must be >= $minimum")
    if (number != null && maximum != null && number > maximum) invalidTypedPayload(path, "must be <= $maximum")
}
