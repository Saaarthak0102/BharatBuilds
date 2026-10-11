import argparse
import boto3
import os
import sys

def advance_reports(force_demo: bool = False):
    stage = os.environ.get("STAGE", "dev").lower()
    table_name = os.environ.get("REPORTS_TABLE", "saans-reports")

    # Safety Guard 1: Never run against production
    if stage in ("prod", "production") or table_name.endswith("-prod"):
        raise RuntimeError(
            f"Safety check failed: Demo advance script cannot run in production environment (STAGE={stage}, Table={table_name})."
        )

    # Safety Guard 2: Require explicit safe demo configuration
    env_demo = os.environ.get("ALLOW_DEMO_MUTATION", "").lower() in ("true", "1") or \
               os.environ.get("DEMO_MODE", "").lower() in ("true", "1")
    if not (force_demo or env_demo):
        raise RuntimeError(
            "Safety check failed: Demo mutation requires an explicit safe demo configuration.\n"
            "Set ALLOW_DEMO_MUTATION=true (or DEMO_MODE=true) in your environment, or pass --allow-demo-mutation."
        )

    region = os.environ.get("AWS_REGION", "ap-south-1")
    dynamodb = boto3.resource('dynamodb', region_name=region)
    table = dynamodb.Table(table_name)
    
    print(f"[DEMO MODE] Scanning table {table_name} for 'routed' reports...")
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
    parser = argparse.ArgumentParser(description="Advance demo reports from routed to resolved.")
    parser.add_argument(
        "--allow-demo-mutation",
        action="store_true",
        help="Explicitly allow demo script to mutate data in non-production environment."
    )
    args = parser.parse_args()
    try:
        advance_reports(force_demo=args.allow_demo_mutation)
    except RuntimeError as err:
        print(f"Aborted: {err}", file=sys.stderr)
        sys.exit(1)

