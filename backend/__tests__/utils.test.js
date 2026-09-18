// Mock HttpsError class
class MockHttpsError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = "HttpsError";
  }
}

jest.mock("firebase-functions", () => ({
  https: {
    HttpsError: MockHttpsError,
  },
}));

const { checkRequiredFields } = require("../utils");

describe("checkRequiredFields", () => {
  it("should not throw if all required fields are present and truthy", () => {
    const payload = { action: "test", data: "value" };
    const requiredKeys = ["action", "data"];

    expect(() => checkRequiredFields(payload, requiredKeys)).not.toThrow();
  });

  it("should throw an HttpsError if payload is undefined", () => {
    expect(() => checkRequiredFields(undefined, ["action"])).toThrow(MockHttpsError);
    expect(() => checkRequiredFields(undefined, ["action"])).toThrow("Missing action or payload");

    try {
      checkRequiredFields(undefined, ["action"]);
    } catch (e) {
      expect(e.code).toBe("invalid-argument");
    }
  });

  it("should throw an HttpsError if payload is null", () => {
    expect(() => checkRequiredFields(null, ["action"])).toThrow("Missing action or payload");
  });

  it("should throw an HttpsError if payload is not an object", () => {
    expect(() => checkRequiredFields("string_payload", ["action"])).toThrow("Missing action or payload");
  });

  it("should throw an HttpsError with default message if a required key is missing", () => {
    const payload = { action: "test" };
    const requiredKeys = ["action", "missingKey"];

    expect(() => checkRequiredFields(payload, requiredKeys)).toThrow("Missing required fields");

    try {
      checkRequiredFields(payload, requiredKeys);
    } catch (e) {
      expect(e.code).toBe("invalid-argument");
    }
  });

  it("should throw an HttpsError with custom message if a required key is missing", () => {
    const payload = { action: "test" };
    const requiredKeys = ["action", "missingKey"];
    const customError = "Custom error missing fields";

    expect(() => checkRequiredFields(payload, requiredKeys, customError)).toThrow(customError);
  });

  it("should throw an HttpsError if a required key is present but falsy", () => {
    const payload = { action: "test", emptyString: "", zero: 0, nulled: null, undef: undefined, falsed: false };

    expect(() => checkRequiredFields(payload, ["emptyString"])).toThrow("Missing required fields");
    expect(() => checkRequiredFields(payload, ["zero"])).toThrow("Missing required fields");
    expect(() => checkRequiredFields(payload, ["nulled"])).toThrow("Missing required fields");
    expect(() => checkRequiredFields(payload, ["undef"])).toThrow("Missing required fields");
    expect(() => checkRequiredFields(payload, ["falsed"])).toThrow("Missing required fields");
  });
});
