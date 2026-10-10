import os
import boto3
from botocore.exceptions import ClientError
from api.common.config import config

def build_model():
    """
    Returns a configured model client based on MODEL_PROVIDER.
    """
    provider = config.MODEL_PROVIDER.lower()
    if provider == "bedrock":
        try:
            from strands.models import BedrockModel
            return BedrockModel(
                model_id=config.BEDROCK_MODEL_ID,
                region_name=config.BEDROCK_REGION,
                temperature=0.1,
                max_tokens=1000
            )
        except ImportError:
            # Fallback to direct client if not using strands SDK
            client = boto3.client("bedrock-runtime", region_name=config.BEDROCK_REGION)
            return client
    elif provider in ("anthropic", "gemini", "openai"):
        raise NotImplementedError(
            f"Provider '{provider}' is not implemented. "
            "Please update services/agents/common/model.py to add support."
        )
    else:
        raise ValueError(f"Unknown MODEL_PROVIDER: {provider}")

def structured_complete(schema: type, prompt: str, image: bytes = None):
    """
    Call the model to return a structured output matching the provided Pydantic schema.
    Used by ALL model calls so no other file imports a provider SDK directly.
    """
    client = boto3.client("bedrock-runtime", region_name=config.BEDROCK_REGION)
    
    tool_name = schema.__name__
    tool_desc = schema.__doc__ or f"Structured output for {tool_name}"
    schema_json = schema.model_json_schema()
    
    tool_config = {
        "tools": [
            {
                "toolSpec": {
                    "name": tool_name,
                    "description": tool_desc,
                    "inputSchema": {
                        "json": schema_json
                    }
                }
            }
        ],
        "toolChoice": {
            "tool": {
                "name": tool_name
            }
        }
    }
    
    content = [{"text": prompt}]
    if image:
        content.append({
            "image": {
                "format": "jpeg",
                "source": {"bytes": image}
            }
        })
        
    messages = [{"role": "user", "content": content}]
    
    response = client.converse(
        modelId=config.BEDROCK_MODEL_ID,
        messages=messages,
        toolConfig=tool_config,
        inferenceConfig={"temperature": 0.1, "maxTokens": 1024}
    )
    
    output = response["output"]["message"]["content"]
    for block in output:
        if "toolUse" in block:
            tool_use = block["toolUse"]
            if tool_use["name"] == tool_name:
                return schema.model_validate(tool_use["input"])
                
    raise ValueError("No valid structured output returned by model.")
