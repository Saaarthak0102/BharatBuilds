import boto3
import os

def advance_reports():
    region = os.environ.get("AWS_REGION", "ap-south-1")
    table_name = os.environ.get("REPORTS_TABLE", "saans-reports")
    dynamodb = boto3.resource('dynamodb', region_name=region)
    table = dynamodb.Table(table_name)
    
    print(f"Scanning table {table_name} for 'routed' reports...")
    try:
        response = table.scan(
            FilterExpression="#s = :status",
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={":status": "routed"}
        )
        
        items = response.get('Items', [])
        if not items:
            print("No 'routed' reports found.")
            return

        for item in items:
            print(f"Advancing report {item['report_id']} from 'routed' to 'resolved'")
            table.update_item(
                Key={'report_id': item['report_id']},
                UpdateExpression="SET #s = :new_status",
                ExpressionAttributeNames={"#s": "status"},
                ExpressionAttributeValues={":new_status": "resolved"}
            )
        print("Done advancing reports.")
    except Exception as e:
        print(f"Error advancing reports: {e}")

if __name__ == "__main__":
    advance_reports()
