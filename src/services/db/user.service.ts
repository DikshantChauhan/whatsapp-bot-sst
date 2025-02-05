import userDb, { User } from "../../db/user.db";
import DbService from "./db.service";

type UE = typeof userDb.entity;
type UT = typeof userDb.table;

class UserService extends DbService<UE, UT> {
  constructor() {
    super(userDb.entity, userDb.table);
  }

  public async update(payload: User) {
    const curr = await this.get({ phoneNumber: payload.phoneNumber });
    if (!curr) throw new Error("User not found");

    return (await super.update(payload, {
      phoneNumber: payload.phoneNumber,
    })) as User;
  }

  public async create(payload: {
    phoneNumber: string;
    name: string;
    currentNodeId: string;
    sessionExpiresAt: Date;
    flowId: string;
  }) {
    const user = await this.get({ phoneNumber: payload.phoneNumber });
    if (user) throw new Error("User already exists");

    return (await super.insert({
      ...payload,
      sessionExpiresAt: payload.sessionExpiresAt.getTime(),
    })) as User;
  }
}

export const userService = new UserService();
