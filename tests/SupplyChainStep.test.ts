 
import { describe, it, expect, beforeEach } from "vitest";
import {
	stringAsciiCV,
	uintCV,
	boolCV,
	buffCV,
	principalCV,
} from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_BATCH = 101;
const ERR_ALREADY_LOGGED = 102;
const ERR_INVALID_LOCATION = 103;
const ERR_INVALID_DOC_HASH = 104;
const ERR_INVALID_DETAILS = 105;
const ERR_INVALID_OWNER = 106;
const ERR_INVALID_STEP_ID = 107;
const ERR_BATCH_NOT_ACTIVE = 108;
const ERR_TRANSFER_NOT_ALLOWED = 109;
const ERR_INVALID_TIMESTAMP = 110;
const ERR_MAX_STEPS_EXCEEDED = 111;
const ERR_INVALID_COMPLIANCE_STATUS = 112;
const ERR_INVALID_METADATA = 113;
const ERR_INVALID_PREVIOUS_STEP = 114;
const ERR_BATCH_LOCKED = 115;
const ERR_INVALID_ROLE = 116;
const ERR_INVALID_ACTION = 117;
const ERR_INVALID_PARAMETER = 118;
const ERR_INVALID_UPDATE = 119;
const ERR_INVALID_QUERY = 120;

interface Step {
	owner: string;
	timestamp: number;
	location: string;
	docHash: Uint8Array;
	details: string;
	complianceStatus: boolean;
	metadata: string;
}

interface BatchOwner {
	currentOwner: string;
	active: boolean;
	locked: boolean;
}

interface Result<T> {
	ok: boolean;
	value: T;
}

class SupplyChainStepMock {
	state: {
		stepCounter: number;
		maxStepsPerBatch: number;
		admin: string;
		batchSteps: Map<string, Step>;
		batchOwners: Map<number, BatchOwner>;
		batchStepCounters: Map<number, number>;
		userRoles: Map<string, string>;
	} = {
		stepCounter: 0,
		maxStepsPerBatch: 50,
		admin: "ST1ADMIN",
		batchSteps: new Map(),
		batchOwners: new Map(),
		batchStepCounters: new Map(),
		userRoles: new Map(),
	};
	blockHeight: number = 0;
	caller: string = "ST1TEST";

	constructor() {
		this.reset();
	}

	reset() {
		this.state = {
			stepCounter: 0,
			maxStepsPerBatch: 50,
			admin: "ST1ADMIN",
			batchSteps: new Map(),
			batchOwners: new Map(),
			batchStepCounters: new Map(),
			userRoles: new Map(),
		};
		this.blockHeight = 0;
		this.caller = "ST1TEST";
	}

	initializeBatch(
		batchId: number,
		initialOwner: string,
		role: string
	): Result<boolean> {
		if (initialOwner === "SP000000000000000000002Q6VF78")
			return { ok: false, value: ERR_INVALID_OWNER };
		if (this.state.batchOwners.has(batchId))
			return { ok: false, value: ERR_ALREADY_LOGGED };
		this.state.batchOwners.set(batchId, {
			currentOwner: initialOwner,
			active: true,
			locked: false,
		});
		this.state.batchStepCounters.set(batchId, 1);
		this.state.userRoles.set(initialOwner, role);
		return { ok: true, value: true };
	}

	logStep(
		batchId: number,
		location: string,
		docHash: Uint8Array,
		details: string,
		compliance: boolean,
		metadata: string
	): Result<number> {
		const stepId = this.state.batchStepCounters.get(batchId) ?? 0;
		const prevStepId = stepId - 1;
		const ownerInfo = this.state.batchOwners.get(batchId);
		if (!ownerInfo) return { ok: false, value: ERR_INVALID_BATCH };
		if (ownerInfo.currentOwner !== this.caller)
			return { ok: false, value: ERR_NOT_AUTHORIZED };
		if (!ownerInfo.active) return { ok: false, value: ERR_BATCH_NOT_ACTIVE };
		if (ownerInfo.locked) return { ok: false, value: ERR_BATCH_LOCKED };
		if (location.length === 0 || location.length > 100)
			return { ok: false, value: ERR_INVALID_LOCATION };
		if (docHash.length !== 32)
			return { ok: false, value: ERR_INVALID_DOC_HASH };
		if (details.length > 200) return { ok: false, value: ERR_INVALID_DETAILS };
		if (metadata.length > 500)
			return { ok: false, value: ERR_INVALID_METADATA };
		if (stepId <= 0) return { ok: false, value: ERR_INVALID_STEP_ID };
		if (
			prevStepId > 0 &&
			!this.state.batchSteps.has(`${batchId}-${prevStepId}`)
		)
			return { ok: false, value: ERR_INVALID_PREVIOUS_STEP };
		if (stepId >= this.state.maxStepsPerBatch)
			return { ok: false, value: ERR_MAX_STEPS_EXCEEDED };
		this.state.batchSteps.set(`${batchId}-${stepId}`, {
			owner: this.caller,
			timestamp: this.blockHeight,
			location,
			docHash,
			details,
			complianceStatus: compliance,
			metadata,
		});
		this.state.batchStepCounters.set(batchId, stepId + 1);
		return { ok: true, value: stepId };
	}

	transferOwnership(batchId: number, newOwner: string): Result<boolean> {
		const ownerInfo = this.state.batchOwners.get(batchId);
		if (!ownerInfo) return { ok: false, value: ERR_INVALID_BATCH };
		if (ownerInfo.currentOwner !== this.caller)
			return { ok: false, value: ERR_NOT_AUTHORIZED };
		if (!ownerInfo.active) return { ok: false, value: ERR_BATCH_NOT_ACTIVE };
		if (newOwner === "SP000000000000000000002Q6VF78")
			return { ok: false, value: ERR_INVALID_OWNER };
		this.state.batchOwners.set(batchId, {
			...ownerInfo,
			currentOwner: newOwner,
		});
		return { ok: true, value: true };
	}

	lockBatch(batchId: number): Result<boolean> {
		const ownerInfo = this.state.batchOwners.get(batchId);
		if (!ownerInfo) return { ok: false, value: ERR_INVALID_BATCH };
		if (ownerInfo.currentOwner !== this.caller)
			return { ok: false, value: ERR_NOT_AUTHORIZED };
		if (!ownerInfo.active) return { ok: false, value: ERR_BATCH_NOT_ACTIVE };
		this.state.batchOwners.set(batchId, { ...ownerInfo, locked: true });
		return { ok: true, value: true };
	}

	deactivateBatch(batchId: number): Result<boolean> {
		const ownerInfo = this.state.batchOwners.get(batchId);
		if (!ownerInfo) return { ok: false, value: ERR_INVALID_BATCH };
		if (ownerInfo.currentOwner !== this.caller)
			return { ok: false, value: ERR_NOT_AUTHORIZED };
		this.state.batchOwners.set(batchId, { ...ownerInfo, active: false });
		return { ok: true, value: true };
	}

	setUserRole(user: string, role: string): Result<boolean> {
		if (this.caller !== this.state.admin)
			return { ok: false, value: ERR_NOT_AUTHORIZED };
		this.state.userRoles.set(user, role);
		return { ok: true, value: true };
	}

	setMaxSteps(newMax: number): Result<boolean> {
		if (this.caller !== this.state.admin)
			return { ok: false, value: ERR_NOT_AUTHORIZED };
		if (newMax <= 0) return { ok: false, value: ERR_INVALID_PARAMETER };
		this.state.maxStepsPerBatch = newMax;
		return { ok: true, value: true };
	}

	getBatchOwner(batchId: number): Result<string | undefined> {
		return {
			ok: true,
			value: this.state.batchOwners.get(batchId)?.currentOwner,
		};
	}

	getBatchStatus(
		batchId: number
	): Result<{ active: boolean | undefined; locked: boolean | undefined }> {
		const info = this.state.batchOwners.get(batchId);
		return { ok: true, value: { active: info?.active, locked: info?.locked } };
	}

	getStepDetails(batchId: number, stepId: number): Step | undefined {
		return this.state.batchSteps.get(`${batchId}-${stepId}`);
	}

	getNextStepId(batchId: number): Result<number | undefined> {
		return { ok: true, value: this.state.batchStepCounters.get(batchId) };
	}

	getUserRole(user: string): Result<string | undefined> {
		return { ok: true, value: this.state.userRoles.get(user) };
	}
}

describe("SupplyChainStep", () => {
	let contract: SupplyChainStepMock;

	beforeEach(() => {
		contract = new SupplyChainStepMock();
		contract.reset();
	});

	it("initializes batch successfully", () => {
		const result = contract.initializeBatch(1, "ST2OWNER", "farmer");
		expect(result.ok).toBe(true);
		expect(contract.getBatchOwner(1).value).toBe("ST2OWNER");
		expect(contract.getUserRole("ST2OWNER").value).toBe("farmer");
	});

	it("logs step successfully", () => {
		contract.initializeBatch(1, "ST1TEST", "farmer");
		const docHash = new Uint8Array(32).fill(0);
		const result = contract.logStep(
			1,
			"FarmA",
			docHash,
			"Harvest",
			true,
			"Organic"
		);
		expect(result.ok).toBe(true);
		expect(result.value).toBe(1);
		const step = contract.getStepDetails(1, 1);
		expect(step?.location).toBe("FarmA");
		expect(step?.complianceStatus).toBe(true);
	});

	it("transfers ownership successfully", () => {
		contract.initializeBatch(1, "ST1TEST", "farmer");
		const result = contract.transferOwnership(1, "ST3PROCESSOR");
		expect(result.ok).toBe(true);
		expect(contract.getBatchOwner(1).value).toBe("ST3PROCESSOR");
	});

	it("locks batch successfully", () => {
		contract.initializeBatch(1, "ST1TEST", "farmer");
		const result = contract.lockBatch(1);
		expect(result.ok).toBe(true);
		expect(contract.getBatchStatus(1).value.locked).toBe(true);
	});

	it("deactivates batch successfully", () => {
		contract.initializeBatch(1, "ST1TEST", "farmer");
		const result = contract.deactivateBatch(1);
		expect(result.ok).toBe(true);
		expect(contract.getBatchStatus(1).value.active).toBe(false);
	});

	it("sets user role successfully", () => {
		contract.caller = "ST1ADMIN";
		const result = contract.setUserRole("ST4USER", "distributor");
		expect(result.ok).toBe(true);
		expect(contract.getUserRole("ST4USER").value).toBe("distributor");
	});

	it("sets max steps successfully", () => {
		contract.caller = "ST1ADMIN";
		const result = contract.setMaxSteps(100);
		expect(result.ok).toBe(true);
		expect(contract.state.maxStepsPerBatch).toBe(100);
	});

	it("rejects log step without initialization", () => {
		const docHash = new Uint8Array(32).fill(0);
		const result = contract.logStep(
			99,
			"FarmA",
			docHash,
			"Harvest",
			true,
			"Organic"
		);
		expect(result.ok).toBe(false);
		expect(result.value).toBe(ERR_INVALID_BATCH);
	});

	it("rejects log step by non-owner", () => {
		contract.initializeBatch(1, "ST2OWNER", "farmer");
		const docHash = new Uint8Array(32).fill(0);
		const result = contract.logStep(
			1,
			"FarmA",
			docHash,
			"Harvest",
			true,
			"Organic"
		);
		expect(result.ok).toBe(false);
		expect(result.value).toBe(ERR_NOT_AUTHORIZED);
	});

	it("rejects log step on locked batch", () => {
		contract.initializeBatch(1, "ST1TEST", "farmer");
		contract.lockBatch(1);
		const docHash = new Uint8Array(32).fill(0);
		const result = contract.logStep(
			1,
			"FarmA",
			docHash,
			"Harvest",
			true,
			"Organic"
		);
		expect(result.ok).toBe(false);
		expect(result.value).toBe(ERR_BATCH_LOCKED);
	});

	it("rejects invalid location", () => {
		contract.initializeBatch(1, "ST1TEST", "farmer");
		const docHash = new Uint8Array(32).fill(0);
		const longLocation = "A".repeat(101);
		const result = contract.logStep(
			1,
			longLocation,
			docHash,
			"Harvest",
			true,
			"Organic"
		);
		expect(result.ok).toBe(false);
		expect(result.value).toBe(ERR_INVALID_LOCATION);
	});

	it("gets next step id correctly", () => {
		contract.initializeBatch(1, "ST1TEST", "farmer");
		expect(contract.getNextStepId(1).value).toBe(1);
	});
});