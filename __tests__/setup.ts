import { beforeAll, afterEach } from "vitest";
import { resetPaymentStore } from "@/lib/payments";

beforeAll(() => {
  process.env.NODE_ENV = "test";
});

afterEach(() => {
  resetPaymentStore();
});
