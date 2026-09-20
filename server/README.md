# FamilyID360 Authentication API

## Overview
FamilyID360 is a web application designed to manage family-related information and services. This project implements authentication using JSON Web Tokens (JWT) and bcrypt for password hashing, ensuring secure access to sensitive family information.

## Features
- User registration and login
- Role-based access control for different user roles: CITIZEN, OFFICER, and ADMIN
- Secure password storage using bcrypt
- JWT-based authentication for API requests
- Middleware for authentication and role verification

## Project Structure
```
server
├── src
│   ├── app.js                # Initializes the Express application and sets up middleware
│   ├── server.js             # Starts the server and listens on a specified port
│   ├── config
│   │   └── auth.js           # Configuration settings for authentication
│   ├── controllers
│   │   └── auth.controller.js # Handles authentication-related requests
│   ├── middleware
│   │   ├── auth.middleware.js # Middleware for verifying JWT tokens
│   │   └── role.middleware.js # Middleware for role-based access control
│   ├── routes
│   │   └── auth.routes.js     # Defines authentication routes
│   ├── services
│   │   └── auth.service.js     # Business logic for authentication
│   ├── validators
│   │   └── auth.validator.js    # Validation functions for user input
│   ├── serializers
│   │   └── user.serializer.js    # Serializes user data
│   └── models
│       └── index.js            # Defines database models and associations
├── .env.example                # Example environment variables
├── package.json                # npm configuration file
└── README.md                   # Project documentation
```

## Installation
1. Clone the repository:
   ```
   git clone <repository-url>
   cd FamilyID360
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on the `.env.example` file and configure your environment variables.

## Usage
1. Start the server:
   ```
   npm start
   ```

2. Access the API documentation for available endpoints and usage instructions.

## API Endpoints
- **POST /api/auth/register**: Register a new user
- **POST /api/auth/login**: Authenticate a user and return a JWT
- **GET /api/protected**: Access a protected route (requires authentication)
- **POST /api/assistant/chat**: Ask the authenticated user's FamilyID Assistant a question

### Assistant provider configuration

The assistant always retrieves family, application, scheme, and eligibility data on the server. Eligibility is calculated by the existing rule-based engine before any response is generated. With `AI_PROVIDER=none`, the server uses a deterministic verified-data formatter. To use an OpenAI-compatible provider, set `AI_PROVIDER=openai_compatible`, `AI_API_URL`, `AI_API_KEY`, and `AI_MODEL` in the server environment. These values are never exposed to the client.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.