import { User } from "../../db/user.db";
import { AppNode, IfElseNode } from "./typings";

type EntityVariableMap = {
  user: User;
  chat: { input?: string };
};

class VariableParserService {
  getVariableMap = (map: EntityVariableMap) => {
    return {
      ...map,
      user: {
        ...map.user,
        level_score: `${Object.values(map.user.current_level_score).reduce(
          (pre, curr) => (pre || 0) + (curr || 0),
          0
        )}/${Object.keys(map.user.current_level_score).length}`,
      },
    };
  };

  getVariableValue = (
    variable: `${string}.${string}`,
    entityMap: EntityVariableMap
  ) => {
    const keys = variable.split(".").map((s) => s.trim());
    try {
      let value = this.getVariableMap(entityMap);

      for (const key of keys) {
        value = value[key as never];
      }

      return value === undefined || value === null ? undefined : String(value);
    } catch (e) {
      throw new Error(`Error parsing map at path: ${variable}`);
    }
  };

  parseNode = (node: AppNode, map: EntityVariableMap): AppNode => {
    const data = JSON.stringify(node.data);
    const parsedData = data.replace(/\${(.*?)}/g, (_, variable) => {
      const value = this.getVariableValue(variable, map);
      return value ? value.replace(/\n/g, "\\n") : "";
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

    const numLhs = Number(lhs);
    const numRhs = Number(rhs);
    console.log({ lhs, rhs, operator, numLhs, numRhs });

    switch (operator) {
      case "!=":
        return lhs != rhs;
      case "==":
        return lhs == rhs;
      case ">": {
        return !isNaN(numLhs) && !isNaN(numRhs) ? numLhs > numRhs : false;
      }
      case ">=": {
        return !isNaN(numLhs) && !isNaN(numRhs) ? numLhs >= numRhs : false;
      }
      case "<": {
        return !isNaN(numLhs) && !isNaN(numRhs) ? numLhs < numRhs : false;
      }
      case "<=": {
        return !isNaN(numLhs) && !isNaN(numRhs) ? numLhs <= numRhs : false;
      }
      default:
        return false;
    }
  };
}

export default new VariableParserService();
