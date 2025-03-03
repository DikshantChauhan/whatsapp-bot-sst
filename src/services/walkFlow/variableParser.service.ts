import { User } from "../../db/user.db";
import { AppNode, IfElseNode } from "./typings";

type EntityVariableMap = {
  user: User;
  chat: { input?: string };
};

class VariableParserService {
  getVariableValue = (
    variable: `${string}.${string}`,
    entityMap: EntityVariableMap
  ) => {
    const [entityName, entityKey] = variable.split(".").map((s) => s.trim());
    try {
      const obj = entityMap[entityName as keyof EntityVariableMap];
      return String(obj[entityKey as keyof typeof obj]);
    } catch (e) {
      throw new Error(`parsing map[${entityName}][${entityKey}]`);
    }
  };

  parseNode = (node: AppNode, map: EntityVariableMap): AppNode => {
    const data = JSON.stringify(node.data);
    const parsedData = data.replace(/\${(.*?)}/g, (_, variable) => {
      const value = this.getVariableValue(variable, map);
      return value;
    });

    return { ...node, data: JSON.parse(parsedData) };
  };

  checkIfElseCondition = (
    condition: IfElseNode["data"]["conditions"][number],
    map: EntityVariableMap
  ): boolean => {
    const lhs = this.getVariableValue(
      condition.variable as `${string}.${string}`,
      map
    );
    const operator = condition.condition;
    const rhs =
      condition.type === "string" || condition.type === "number"
        ? condition.value
        : condition.type === "null"
        ? undefined
        : condition.type === "boolean"
        ? condition.value === "true"
        : this.getVariableValue(condition.value as `${string}.${string}`, map);

    switch (operator) {
      case "!=":
        return lhs != rhs;
      case "==":
        return lhs == rhs;
      case ">":
        return lhs > rhs!;
      case ">=":
        return lhs >= rhs!;
      case "<":
        return lhs < rhs!;
      case "<=":
        return lhs <= rhs!;
      default:
        return false;
    }
  };
}

export default new VariableParserService();
