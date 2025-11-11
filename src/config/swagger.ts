import swaggerJSDoc from "swagger-jsdoc";

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Participium API",
      version: "1.0.0",
      description: "API for Participium project",
    },
    servers: [
      {
        url: "/api",
      },
    ],
    components: {
      securitySchemes: {
        citizenPassword: {
          type: "oauth2",
          flows: {
            password: {
              tokenUrl: "/api/auth/citizens/login",
              scopes: {},
            },
          },
          description: "Log in as citizen using email/password",
        },
        internalPassword: {
          type: "oauth2",
          flows: {
            password: {
              tokenUrl: "/api/auth/internal/login",
              scopes: {},
            },
          },
          description: "Log in as internal user using email/password",
        },
      },
    },
  },
  apis: [
    "./src/routes/*.ts",
    "./src/models/dto/*.ts"
  ],
};

export const swaggerSpec = swaggerJSDoc(options);
