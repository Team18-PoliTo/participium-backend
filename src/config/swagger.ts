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
        url: "http://localhost:3001/api",
      },
    ],
  },
  // Indica tutti i file che contengono le annotazioni JSDoc
  apis: [
    "./src/routes/*.ts",
    "./src/models/dto/*.ts"
  ],
};

export const swaggerSpec = swaggerJSDoc(options);
