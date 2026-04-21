import request from "supertest";
import app from "../../app.mjs";
import HouseListing from "../../models/HouseListing.mjs";

jest.mock("../../models/HouseListing.mjs");

describe("House Listing API", () => {

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/house-listing", () => {

    it("should return all houses", async () => {
      const mockHouses = [
        { _id: "1", title: "House 1" },
        { _id: "2", title: "House 2" }
      ];

      HouseListing.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockHouses)
      });

      const res = await request(app).get("/api/house-listing");

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(mockHouses);
    });

    it("should handle errors", async () => {
      HouseListing.find.mockImplementation(() => {
        throw new Error("DB Error");
      });

      const res = await request(app).get("/api/house-listing");

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty("message", "DB Error");
    });
  });

  describe("POST /api/house-listing", () => {

    it("should create a new house", async () => {
      const newHouse = { title: "New House" };

      HouseListing.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(newHouse)
      }));

      const res = await request(app)
        .post("/api/house-listing")
        .send(newHouse);

      expect(res.statusCode).toBe(201);
      expect(res.body).toEqual(newHouse);
    });

    it("should handle validation errors", async () => {
      HouseListing.mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(new Error("Validation failed"))
      }));

      const res = await request(app)
        .post("/api/house-listing")
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("message", "Validation failed");
    });

  });

});