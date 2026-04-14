import request from "supertest";
import app from "../../app.mjs";
import HouseBooking from "../../models/HouseBooking.mjs";

jest.mock("../../models/HouseBooking.mjs");

describe("House Booking API", () => {

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/house-booking", () => {

    it("should return all bookings", async () => {
      const mockBookings = [
        { _id: "1", house: "A" },
        { _id: "2", house: "B" }
      ];

      HouseBooking.find.mockResolvedValue(mockBookings);

      const res = await request(app).get("/api/house-booking");

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(mockBookings);
    });

    it("should handle errors", async () => {
      HouseBooking.find.mockRejectedValue(new Error("DB error"));

      const res = await request(app).get("/api/house-booking");

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty("message", "DB error");
    });
  });

});