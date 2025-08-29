import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app.js";

describe("GET /networks", () => {
	it("returns supported networks", async () => {
		const res = await request(app).get("/networks").expect(200);
		expect(Array.isArray(res.body)).toBe(true);
		expect(res.body).toEqual(expect.arrayContaining(["ethereum", "sepolia", "matic"]));
	});
});


