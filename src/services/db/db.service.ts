import {
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
  protected entity: E;
  protected table: T;

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

    return Item;
  }

  protected async update(item: UpdateItemInput<E>, key: KeyInputItem<E>) {
    const transormedItems =
      typeof item === "object"
        ? Object.entries(item).reduce((acc, [key, value]) => {
            if (typeof value === "object") {
              return { ...acc, [key]: $set(value) };
            }

            return { ...acc, [key]: value };
          }, {} as UpdateItemInput<E>)
        : item;

    await this.entity.build(UpdateItemCommand).item(transormedItems).send();

    const updatedItem = await this.get(key);

    return updatedItem;
  }

  protected async scanAll() {
    const { Items } = await this.table
      .build(ScanCommand)
      .entities(this.entity)
      .send();

    return Items;
  }

  public async delete(key: KeyInputItem<E>) {
    const { $metadata } = await this.entity
      .build(DeleteItemCommand)
      .key(key)
      .send();

    return $metadata.httpStatusCode === 200;
  }
}
