"""
Custom Tools
Define your custom tools here using the dynamic tool system
"""
from .dynamic_tools import tool_registry
import requests
from datetime import datetime
import json


@tool_registry.register(
    tool_id="weather-lookup",
    name="weather_lookup",
    description="Get current weather information for a location"
)
def get_weather(location: str) -> str:
    """Get weather information for a location"""
    try:
        # This is a placeholder - in production, use a real weather API
        return f"Weather information for {location}: Sunny, 72°F (22°C)"
    except Exception as e:
        return f"Error getting weather: {str(e)}"


@tool_registry.register(
    tool_id="timestamp-converter",
    name="timestamp_converter",
    description="Convert between timestamps and human-readable dates"
)
def convert_timestamp(timestamp: str) -> str:
    """Convert timestamp to human-readable date"""
    try:
        if timestamp.isdigit():
            # Unix timestamp
            dt = datetime.fromtimestamp(int(timestamp))
        else:
            # ISO format
            dt = datetime.fromisoformat(timestamp)
        
        return f"Converted timestamp: {dt.strftime('%Y-%m-%d %H:%M:%S')}"
    except Exception as e:
        return f"Error converting timestamp: {str(e)}"


@tool_registry.register(
    tool_id="text-analyzer",
    name="text_analyzer",
    description="Analyze text and provide statistics"
)
def analyze_text(text: str) -> str:
    """Analyze text and return statistics"""
    try:
        words = text.split()
        chars = len(text)
        lines = text.count('\n') + 1
        
        return json.dumps({
            'characters': chars,
            'words': len(words),
            'lines': lines,
            'average_word_length': sum(len(word) for word in words) / len(words) if words else 0
        }, indent=2)
    except Exception as e:
        return f"Error analyzing text: {str(e)}"


@tool_registry.register(
    tool_id="json-validator",
    name="json_validator",
    description="Validate and format JSON strings"
)
def validate_json(json_string: str) -> str:
    """Validate and format JSON"""
    try:
        parsed = json.loads(json_string)
        return f"Valid JSON! Formatted:\n{json.dumps(parsed, indent=2)}"
    except json.JSONDecodeError as e:
        return f"Invalid JSON: {str(e)}"

