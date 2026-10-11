#!/usr/bin/env python3
"""
Create or update demo users in AWS Cognito and DynamoDB Users table for Saans.

Idempotent:
1. Creates Cognito users (farmer and citizen) with admin_create_user (MessageAction SUPPRESS).
2. Sets custom:role at creation (with graceful fallback if custom attribute is restricted).
3. Sets permanent password with admin_set_user_password.
4. Writes corresponding profile items to the DynamoDB Users table using the user's sub.
5. NEVER prints passwords to stdout/stderr.

Usage:
    python scripts/create_demo_users.py \\
        --farmer-email farmer.demo@saans.internal \\
        --farmer-password "FarmerDemo123!" \\
        --citizen-email citizen.demo@saans.internal \\
        --citizen-password "CitizenDemo123!"
"""

import argparse
from datetime import datetime, timezone, timedelta
from decimal import Decimal
import os
import sys
from typing import Any, Optional

import boto3
from botocore.exceptions import ClientError

IST = timezone(timedelta(hours=5, minutes=30))


def now_ist_iso() -> str:
    return datetime.now(IST).isoformat()


def parse_decimal(val: Any) -> Any:
    if isinstance(val, float):
        return Decimal(str(val))
    if isinstance(val, dict):
        return {k: parse_decimal(v) for k, v in val.items()}
    if isinstance(val, list):
        return [parse_decimal(v) for v in val]
    return val


def find_user_pool_id(cognito_client: Any) -> Optional[str]:
    """Attempts to auto-discover user pool if not explicitly set."""
    env_pool = os.environ.get("COGNITO_USER_POOL_ID") or os.environ.get("NEXT_PUBLIC_COGNITO_USER_POOL_ID")
    if env_pool:
        return env_pool

    try:
        pools = cognito_client.list_user_pools(MaxResults=30).get("UserPools", [])
        for p in pools:
            name = p.get("Name", "").lower()
            if "saans" in name:
                return p.get("Id")
        if pools:
            return pools[0].get("Id")
    except Exception as e:
        print(f"[WARN] Could not auto-discover Cognito User Pool: {e}")
    return None


def get_sub_from_user_attributes(attributes: list[dict[str, str]]) -> Optional[str]:
    for attr in attributes:
        if attr.get("Name") == "sub":
            return attr.get("Value")
    return None


def ensure_cognito_user(
    cognito_client: Any,
    user_pool_id: str,
    email: str,
    password: str,
    role: str,
) -> str:
    """
    Creates or retrieves a Cognito user and sets their permanent password.
    Returns the user's sub (UUID).
    """
    print(f"Ensuring Cognito user for {email} (role: {role})...")
    sub: Optional[str] = None

    try:
        existing = cognito_client.admin_get_user(
            UserPoolId=user_pool_id,
            Username=email,
        )
        sub = get_sub_from_user_attributes(existing.get("UserAttributes", []))
        print(f"  User {email} already exists (sub: {sub}).")
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code")
        if error_code != "UserNotFoundException":
            raise

    if not sub:
        # Create user with role attribute
        attrs = [
            {"Name": "email", "Value": email},
            {"Name": "email_verified", "Value": "true"},
            {"Name": "custom:role", "Value": role},
        ]
        try:
            resp = cognito_client.admin_create_user(
                UserPoolId=user_pool_id,
                Username=email,
                UserAttributes=attrs,
                MessageAction="SUPPRESS",
            )
            sub = get_sub_from_user_attributes(resp.get("User", {}).get("Attributes", []))
            print(f"  Created user {email} (sub: {sub}).")
        except ClientError as create_err:
            msg = str(create_err)
            if "custom:role" in msg or "InvalidParameterException" in msg:
                print(f"[NOTICE] Cognito rejected 'custom:role' at creation: {create_err}")
                print("  Attempting fallback creation without 'custom:role' attribute...")
                fallback_attrs = [
                    {"Name": "email", "Value": email},
                    {"Name": "email_verified", "Value": "true"},
                ]
                resp = cognito_client.admin_create_user(
                    UserPoolId=user_pool_id,
                    Username=email,
                    UserAttributes=fallback_attrs,
                    MessageAction="SUPPRESS",
                )
                sub = get_sub_from_user_attributes(resp.get("User", {}).get("Attributes", []))
                print(f"  Fallback created user {email} (sub: {sub}).")
                # Try updating attribute post-creation
                try:
                    cognito_client.admin_update_user_attributes(
                        UserPoolId=user_pool_id,
                        Username=email,
                        UserAttributes=[{"Name": "custom:role", "Value": role}],
                    )
                    print(f"  Updated 'custom:role'={role} post-creation.")
                except Exception as update_err:
                    print(f"[WARN] Could not update 'custom:role' post-creation: {update_err}")
            else:
                raise

    if not sub:
        # Fetch attributes once more to guarantee we have the sub
        user_info = cognito_client.admin_get_user(
            UserPoolId=user_pool_id,
            Username=email,
        )
        sub = get_sub_from_user_attributes(user_info.get("UserAttributes", []))

    if not sub:
        raise ValueError(f"Could not resolve Cognito sub for {email}")

    # Set permanent password
    cognito_client.admin_set_user_password(
        UserPoolId=user_pool_id,
        Username=email,
        Password=password,
        Permanent=True,
    )
    print("  Permanent password successfully updated.")

    return sub


def upsert_user_profile(
    table: Any,
    sub: str,
    profile_item: dict[str, Any],
) -> None:
    now_iso = now_ist_iso()
    try:
        existing = table.get_item(Key={"user_id": sub}).get("Item")
    except Exception as e:
        existing = None

    if existing:
        profile_item["created_at"] = existing.get("created_at", now_iso)
    else:
        profile_item["created_at"] = now_iso

    profile_item["updated_at"] = now_iso
    parsed = parse_decimal(profile_item)
    table.put_item(Item=parsed)
    print(f"  Profile item upserted in DynamoDB for sub {sub} (role: {profile_item.get('role')}).")


def main():
    parser = argparse.ArgumentParser(description="Create Saans demo users in Cognito & DynamoDB")
    parser.add_argument("--farmer-email", required=True, help="Email for demo farmer user")
    parser.add_argument("--farmer-password", required=True, help="Password for demo farmer user")
    parser.add_argument("--citizen-email", required=True, help="Email for demo citizen user")
    parser.add_argument("--citizen-password", required=True, help="Password for demo citizen user")
    parser.add_argument("--user-pool-id", help="Cognito User Pool ID (optional, checks env/auto-discover)")
    parser.add_argument("--users-table", help="DynamoDB Users table name (optional, default: saans-users or USERS_TABLE)")
    parser.add_argument("--stage", default="dev", help="Stage name (default: dev)")
    parser.add_argument("--region", help="AWS Region (default from AWS_REGION or ap-south-1)")
    args = parser.parse_args()

    region = args.region or os.environ.get("AWS_REGION", "ap-south-1")
    cognito = boto3.client("cognito-idp", region_name=region)
    dynamodb = boto3.resource("dynamodb", region_name=region)

    pool_id = args.user_pool_id or find_user_pool_id(cognito)
    if not pool_id:
        print("[ERROR] Cognito User Pool ID is required. Pass --user-pool-id or set COGNITO_USER_POOL_ID.", file=sys.stderr)
        sys.exit(1)

    table_name = args.users_table or os.environ.get("USERS_TABLE") or f"saans-users-{args.stage}"
    try:
        users_table = dynamodb.Table(table_name)
    except Exception as e:
        print(f"[ERROR] Could not reference DynamoDB table {table_name}: {e}", file=sys.stderr)
        sys.exit(1)

    print(f"Configured Region: {region}")
    print(f"User Pool ID: {pool_id}")
    print(f"Users Table: {table_name}\n")

    # 1. Farmer user
    farmer_sub = ensure_cognito_user(
        cognito_client=cognito,
        user_pool_id=pool_id,
        email=args.farmer_email,
        password=args.farmer_password,
        role="farmer",
    )
    farmer_profile = {
        "user_id": farmer_sub,
        "role": "farmer",
        "name": "Gurpreet Singh",
        "village_id": "village-pb-pat-001",
        "village_name": "Rajpura",
        "district": "Patiala",
        "land_size_acres": 12,
        "main_crop": "paddy",
        "crop_stage": "harvested",
        "has_own_machine": False,
        "language": "pa",
        "is_sample": False,
    }
    upsert_user_profile(users_table, farmer_sub, farmer_profile)

    print()

    # 2. Citizen user
    citizen_sub = ensure_cognito_user(
        cognito_client=cognito,
        user_pool_id=pool_id,
        email=args.citizen_email,
        password=args.citizen_password,
        role="citizen",
    )
    citizen_profile = {
        "user_id": citizen_sub,
        "role": "citizen",
        "name": "Ananya Sharma",
        "area_id": "ward-east-delhi-001",
        "area_name": "Anand Vihar",
        "language": "hi",
        "has_kids": False,
        "has_elderly": False,
        "alert_threshold": 200,
        "alert_opt_in": True,
        "household_note": "",
        "is_sample": False,
    }
    upsert_user_profile(users_table, citizen_sub, citizen_profile)

    print("\nDemo users successfully configured in Cognito and DynamoDB.")


if __name__ == "__main__":
    main()
