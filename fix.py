import sys
path = r"d:\BharatBuilds\services\api\handlers\reports.py"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace(
    'UpdateExpression="ADD request_count :inc SET ttl = :ttl",',
    'UpdateExpression="ADD request_count :inc SET #ttl = :ttl",\n            ExpressionAttributeNames={"#ttl": "ttl"},'
)

with open(path, "w", encoding="utf-8") as f:
    f.write(text)
