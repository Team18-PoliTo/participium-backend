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
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT token for citizen",
        },
        internalPassword: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT token for internal user",
        },
      },
    },
  },
  apis: [
    "./src/routes/*.ts",
    "./src/models/dto/*.ts",
  ],
};

export const swaggerSpec = swaggerJSDoc(options);

