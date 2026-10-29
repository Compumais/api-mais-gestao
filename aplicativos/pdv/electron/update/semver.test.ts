import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compareSemver, versaoRemotaMaior } from "./semver";

describe("compareSemver", () => {
	it("ordena patch/minor/major", () => {
		assert.equal(compareSemver("0.1.2", "0.1.3"), -1);
		assert.equal(compareSemver("0.2.0", "0.1.9"), 1);
		assert.equal(compareSemver("1.0.0", "1.0.0"), 0);
	});

	it("versaoRemotaMaior", () => {
		assert.equal(versaoRemotaMaior("0.1.2", "0.1.3"), true);
		assert.equal(versaoRemotaMaior("0.1.3", "0.1.2"), false);
		assert.equal(versaoRemotaMaior("0.1.2", "0.1.2"), false);
	});
});
