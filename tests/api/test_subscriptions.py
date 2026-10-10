import json
import pytest
from unittest.mock import MagicMock
from tests.conftest import build_event

class TestSubscriptionsEndpoint:
    @pytest.fixture(autouse=True)
    def mock_sns(self, mocker):
        sns_mock = MagicMock()
        sns_mock.subscribe.return_value = {"SubscriptionArn": "arn:aws:sns:mock:sub:123"}
        mocker.patch("services.api.handlers.subscriptions.sns", sns_mock)
        return sns_mock

    def test_post_validation(self):
        from services.api.handlers.subscriptions import handler
        event = build_event("POST", "/v1/subscriptions", body={"area_id": "a"}, role="citizen")
        res = handler(event, None)
        assert res["statusCode"] == 400
        assert "threshold, and email" in json.loads(res["body"])["error"]["message"]

    def test_post_idempotent_subscribe(self, mock_sns, mocker):
        from services.api.handlers.subscriptions import handler
        import boto3
        
        # Mock dynamodb table
        table_mock = MagicMock()
        table_mock.get_item.return_value = {}
        mocker.patch("services.api.handlers.subscriptions.table", table_mock)
        
        event = build_event("POST", "/v1/subscriptions", body={"area_id": "a", "threshold": 100, "email": "test@example.com"}, role="citizen", sub="user1")
        res = handler(event, None)
        assert res["statusCode"] == 201
        assert mock_sns.subscribe.call_count == 1
        
        # Now simulate already subscribed
        table_mock.get_item.return_value = {"Item": {"subscription_id": "user1", "sns_subscription_arn": "arn:aws:sns:mock:sub:123"}}
        res = handler(event, None)
        assert res["statusCode"] == 201
        # sns.subscribe should NOT be called again
        assert mock_sns.subscribe.call_count == 1

    def test_get_ownership(self, mocker):
        from services.api.handlers.subscriptions import handler
        table_mock = MagicMock()
        table_mock.get_item.return_value = {"Item": {"subscription_id": "user1", "area_id": "a"}}
        mocker.patch("services.api.handlers.subscriptions.table", table_mock)

        event = build_event("GET", "/v1/subscriptions", role="citizen", sub="user1")
        res = handler(event, None)
        assert res["statusCode"] == 200
        table_mock.get_item.assert_called_with(Key={"subscription_id": "user1"})

    def test_delete_ownership(self, mocker, mock_sns):
        from services.api.handlers.subscriptions import handler
        table_mock = MagicMock()
        table_mock.get_item.return_value = {"Item": {"subscription_id": "user1", "sns_subscription_arn": "arn:aws:sns:mock:sub:123"}}
        mocker.patch("services.api.handlers.subscriptions.table", table_mock)

        event = build_event("DELETE", "/v1/subscriptions", role="citizen", sub="user1")
        res = handler(event, None)
        assert res["statusCode"] == 200
        mock_sns.unsubscribe.assert_called_with(SubscriptionArn="arn:aws:sns:mock:sub:123")
        table_mock.delete_item.assert_called_with(Key={"subscription_id": "user1"})
