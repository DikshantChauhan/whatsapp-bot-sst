import {
  $remove,
  $set,
  DeleteItemCommand,
  Entity,
  GetItemCommand,
  KeyInputItem,
  PutItemCommand,
  PutItemInput,
  ScanCommand,
  Table,
  UpdateItemCommand,
  UpdateItemInput,
} from "dynamodb-toolbox";

export default class DbService<E extends Entity, T extends Table> {
  entity: E;
  table: T;

  constructor(entity: E, table: T) {
    this.entity = entity;
    this.table = table;
  }

  async insert(item: PutItemInput<E>) {
    const { ToolboxItem } = await this.entity
      .build(PutItemCommand)
      .item(item)
      .send();

    return ToolboxItem;
  }

  async get(key: KeyInputItem<E>) {
    const { Item } = await this.entity.build(GetItemCommand).key(key).send();

    return Item;
  }

  async update(item: UpdateItemInput<E>) {
    const transormedItems = Object.entries(item).reduce((acc, [key, value]) => {
      if (value === undefined) {
        return { ...acc, [key]: $remove() };
      }

      if (typeof value === "object") {
        return { ...acc, [key]: $set(value) };
      }

      return { ...acc, [key]: value };
    }, {} as UpdateItemInput<E>);

    return await this.entity
      .build(UpdateItemCommand)
      .item(transormedItems as UpdateItemInput<E>)
      .send();
  }

  async scanAll() {
    const { Items } = await this.table
      .build(ScanCommand)
      .entities(this.entity)
      .send();

    return Items;
  }

  async delete(key: KeyInputItem<E>) {
    const { $metadata } = await this.entity
      .build(DeleteItemCommand)
      .key(key)
      .send();

    return $metadata.httpStatusCode === 200;
  }

  async getOrFail(key: KeyInputItem<E>) {
    const item = await this.get(key);
    if (!item) throw new Error("Item not found");
    return item;
  }

  async updateAndGet(
    key: KeyInputItem<E>,
    items: Parameters<typeof this.update>[0]
  ) {
    await this.update(items);
    return this.getOrFail(key);
  }
}
