import { createServer } from "http";
import jwt from "jsonwebtoken";

describe("internalSocket", () => {
  let mockIo: any;
  let mockNsp: any;
  let mockSocket: any;
  let mockHttpServer: any;
  let initInternalSocket: any;
  let emitCommentCreated: any;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    mockNsp = {
      use: jest.fn(),
      on: jest.fn(),
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };
    mockIo = {
      of: jest.fn().mockReturnValue(mockNsp),
    };

    jest.doMock("socket.io", () => {
      return {
        Server: jest.fn().mockImplementation(() => mockIo),
      };
    });

    jest.doMock("jsonwebtoken", () => ({
      verify: jest.fn(),
    }));

    const internalSocketModule = require("../../../src/ws/internalSocket");
    initInternalSocket = internalSocketModule.initInternalSocket;
    emitCommentCreated = internalSocketModule.emitCommentCreated;
    mockSocket = {
      handshake: { auth: {}, headers: {} },
      data: {},
      join: jest.fn(),
      leave: jest.fn(),
      on: jest.fn(),
    };
    mockHttpServer = createServer();
  });

  describe("initInternalSocket", () => {
    it("initializes Socket.IO with the server", () => {
      initInternalSocket(mockHttpServer);
      
      const { Server } = require("socket.io");
      expect(Server).toHaveBeenCalledWith(mockHttpServer, expect.any(Object));
      expect(mockIo.of).toHaveBeenCalledWith("/ws/internal");
    });

    it("registers authentication middleware and connection handler", () => {
      initInternalSocket(mockHttpServer);
      expect(mockNsp.use).toHaveBeenCalled();
      expect(mockNsp.on).toHaveBeenCalledWith("connection", expect.any(Function));
    });
  });

  describe("Authentication Middleware", () => {
    let authMiddleware: (socket: any, next: (err?: any) => void) => void;

    beforeEach(() => {
      initInternalSocket(mockHttpServer);
      authMiddleware = mockNsp.use.mock.calls[0][0];
    });

    it("calls next(Error) if token is missing", () => {
      const next = jest.fn();
      mockSocket.handshake.auth = {};
      mockSocket.handshake.headers = {};

      authMiddleware(mockSocket, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toContain("missing token");
    });

    it("extracts token from Bearer header if auth.token is missing", () => {
      const next = jest.fn();
      mockSocket.handshake.headers = { authorization: "Bearer valid_token" };
      
      const { verify } = require("jsonwebtoken");
      verify.mockReturnValue({ sub: 1, kind: "internal" });

      authMiddleware(mockSocket, next);

      expect(verify).toHaveBeenCalledWith("valid_token", expect.any(String));
      expect(next).toHaveBeenCalledWith();
    });

    it("calls next(Error) if token is malformed", () => {
      const next = jest.fn();
      mockSocket.handshake.auth = { token: "token" };
      
      const { verify } = require("jsonwebtoken");
      verify.mockReturnValue("string_payload");

      authMiddleware(mockSocket, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "Unauthorized: malformed token" }));
    });

    it("calls next(Error) if kind is not internal", () => {
      const next = jest.fn();
      mockSocket.handshake.auth = { token: "token" };
      
      const { verify } = require("jsonwebtoken");
      verify.mockReturnValue({ sub: 1, kind: "citizen" });

      authMiddleware(mockSocket, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "Forbidden: not an internal user" }));
    });
  });

  describe("Connection Handler", () => {
    let connectionHandler: (socket: any) => void;

    beforeEach(() => {
      initInternalSocket(mockHttpServer);
      const call = mockNsp.on.mock.calls.find((c: any) => c[0] === "connection");
      connectionHandler = call[1];
    });

    it("registers join_report and leave_report listeners", () => {
      connectionHandler(mockSocket);
      expect(mockSocket.on).toHaveBeenCalledWith("join_report", expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith("leave_report", expect.any(Function));
    });

    describe("Socket Events", () => {
        let joinHandler: Function;
        let leaveHandler: Function;
  
        beforeEach(() => {
          connectionHandler(mockSocket);
          const joinCall = mockSocket.on.mock.calls.find((c: any) => c[0] === "join_report");
          const leaveCall = mockSocket.on.mock.calls.find((c: any) => c[0] === "leave_report");
          joinHandler = joinCall[1];
          leaveHandler = leaveCall[1];
        });
  
        it("join_report joins the correct room", () => {
          joinHandler({ reportId: 5 });
          expect(mockSocket.join).toHaveBeenCalledWith("report:5");
        });
  
        it("join_report ignores invalid IDs", () => {
          joinHandler({ reportId: "bad" });
          joinHandler({ reportId: 0 });
          joinHandler({});
          expect(mockSocket.join).not.toHaveBeenCalled();
        });
  
        it("leave_report leaves the correct room", () => {
          leaveHandler({ reportId: 10 });
          expect(mockSocket.leave).toHaveBeenCalledWith("report:10");
        });
  
        it("leave_report ignores invalid IDs", () => {
          leaveHandler({ reportId: -1 });
          expect(mockSocket.leave).not.toHaveBeenCalled();
        });
      });
  });

  describe("emitCommentCreated", () => {
    it("emits event to the specific room", () => {
      initInternalSocket(mockHttpServer);
      const payload = { id: 1, text: "New Comment" };
      
      emitCommentCreated(99, payload);

      expect(mockIo.of).toHaveBeenCalledWith("/ws/internal");
      expect(mockNsp.to).toHaveBeenCalledWith("report:99");
      expect(mockNsp.emit).toHaveBeenCalledWith("comment.created", payload);
    });
  });
});
