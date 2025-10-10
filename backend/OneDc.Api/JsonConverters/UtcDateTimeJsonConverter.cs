using System.Text.Json;
using System.Text.Json.Serialization;

namespace OneDc.Api.JsonConverters;

public class UtcDateTimeJsonConverter : JsonConverter<DateTime>
{
    public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var dateString = reader.GetString();
        if (DateTime.TryParse(dateString, out var date))
        {
            // If the parsed date has no timezone info (Kind=Unspecified), treat it as UTC
            if (date.Kind == DateTimeKind.Unspecified)
            {
                return DateTime.SpecifyKind(date, DateTimeKind.Utc);
            }
            // Convert to UTC if it's local time
            else if (date.Kind == DateTimeKind.Local)
            {
                return date.ToUniversalTime();
            }
            // Return as-is if already UTC
            return date;
        }
        throw new JsonException($"Unable to parse '{dateString}' as DateTime");
    }

    public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
    {
        // Always write as UTC ISO string
        var utcValue = value.Kind == DateTimeKind.Utc ? value : value.ToUniversalTime();
        writer.WriteStringValue(utcValue.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"));
    }
}

public class NullableUtcDateTimeJsonConverter : JsonConverter<DateTime?>
{
    public override DateTime? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Null)
            return null;

        var dateString = reader.GetString();
        if (DateTime.TryParse(dateString, out var date))
        {
            // If the parsed date has no timezone info (Kind=Unspecified), treat it as UTC
            if (date.Kind == DateTimeKind.Unspecified)
            {
                return DateTime.SpecifyKind(date, DateTimeKind.Utc);
            }
            // Convert to UTC if it's local time
            else if (date.Kind == DateTimeKind.Local)
            {
                return date.ToUniversalTime();
            }
            // Return as-is if already UTC
            return date;
        }
        throw new JsonException($"Unable to parse '{dateString}' as DateTime");
    }

    public override void Write(Utf8JsonWriter writer, DateTime? value, JsonSerializerOptions options)
    {
        if (value.HasValue)
        {
            // Always write as UTC ISO string
            var utcValue = value.Value.Kind == DateTimeKind.Utc ? value.Value : value.Value.ToUniversalTime();
            writer.WriteStringValue(utcValue.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"));
        }
        else
        {
            writer.WriteNullValue();
        }
    }
}
