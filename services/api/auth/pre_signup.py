def handler(event, context):
    user_attributes = event['request']['userAttributes']
    role = user_attributes.get('custom:role')
    
    if role not in ('farmer', 'citizen'):
        raise Exception("Invalid role. Must be 'farmer' or 'citizen'.")
    
    # demo trade-off: avoids paid SMS by auto-verifying phone numbers
    # without requiring a real OTP code SMS
    if 'phone_number' in user_attributes or event.get('userName', '').startswith('+'):
        event['response']['autoConfirmUser'] = True
        event['response']['autoVerifyPhone'] = True
        
    return event
