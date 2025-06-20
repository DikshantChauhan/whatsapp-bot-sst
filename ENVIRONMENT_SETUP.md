# Environment Setup

This project requires the following environment variables to be set in a `.env` file in the root directory.

## Required Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# WhatsApp API Configuration
WHATSAPP_API_TOKEN=your_whatsapp_api_token_here
PHONE_NUMBER_ID=your_phone_number_id_here
ADMIN_PHONE_NUMBERS=918126872525,918126872526
```

## Variable Descriptions

- `WHATSAPP_API_TOKEN`: Your WhatsApp Business API token from Meta/Facebook
- `PHONE_NUMBER_ID`: Your WhatsApp Business phone number ID
- `ADMIN_PHONE_NUMBERS`: Comma-separated list of admin phone numbers (without + or country code prefix)

## Example Values

Based on your current configuration:

- `WHATSAPP_API_TOKEN`: EAAQGJtu3QscBO0ZABsu3KCdqZAzbynyhRlprrZC8P950XHHXyci2ZBBMgmyOMdxoJHjaDYbZAzZBgCLArbnyUYsADNLeye964LdEZBk7CHsdVS9BsJMDtOG1ZCsld5CRBecXePHmGGIYtYuidDXZBheiE84YMGO0jZCIN0BUorL4pwt4ZCvtlZBckt7ae52vsVzyQdacl9vQEJHgGuTtEtiQIXGivcBJvOVhidXB0twcCeR3
- `PHONE_NUMBER_ID`: 474504922422313
- `ADMIN_PHONE_NUMBERS`: 918126872525

## Validation

The application will validate these environment variables on startup using Zod. If any required variables are missing or invalid, the application will throw an error with a descriptive message.

## Security Note

- Never commit your `.env` file to version control
- The `.env` file is already included in `.gitignore`
- Keep your API tokens secure and rotate them regularly
