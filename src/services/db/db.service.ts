import {
  Entity,
  GetItemCommand,
  KeyInputItem,
  PutItemCommand,
  PutItemInput,
  Table,
  UpdateItemCommand,
  UpdateItemInput,
  ScanCommand,
  DeleteItemCommand,
} from "dynamodb-toolbox";
import { User } from "../../db/user.db";

export default class DbService<E extends Entity, T extends Table> {
  private entity: E;
  private table: T;

  constructor(entity: E, table: T) {
    this.entity = entity;
    this.table = table;
  }

  public async insert(item: PutItemInput<E>) {
    const { ToolboxItem } = await this.entity
      .build(PutItemCommand)
      .item(item)
      .send();

    return ToolboxItem;
  }

  public async get(key: KeyInputItem<E>) {
    const { Item } = await this.entity.build(GetItemCommand).key(key).send();

    return Item as User;
  }

  public async update(item: UpdateItemInput<E>, key: KeyInputItem<E>) {
    await this.entity.build(UpdateItemCommand).item(item).send();

    const updatedItem = await this.get(key);

    return updatedItem;
  }

  public async getAll() {
    const { Items } = await this.entity.table.build(ScanCommand).send();

    return Items;
  }

  public async delete(key: KeyInputItem<E>) {
    await this.entity.build(DeleteItemCommand).key(key).send();
  }
}
