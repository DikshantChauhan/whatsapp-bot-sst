import { S3 } from "@aws-sdk/client-s3";
import { Flow } from "./flow/typings";
import { Resource } from "sst";

class S3Service {
  private s3: S3;

  constructor() {
    this.s3 = new S3();
  }

  async postFlow(flow: Flow) {
    const flowJson = JSON.stringify(flow);
    const uploadParams = {
      Bucket: Resource.S3Bucket.name,
      Key: `flows/${flow.name}.json`,
      Body: flowJson,
    };

    await this.s3.putObject(uploadParams);
  }

  async getFlow(flowName: string): Promise<Flow | null> {
    const path = `flows/${flowName}.json`;
    const params = {
      Bucket: Resource.S3Bucket.name,
      Key: path,
    };

    try {
      const response = await this.s3.getObject(params);
      const bodyContents = await response.Body?.transformToString();
      return bodyContents ? JSON.parse(bodyContents) : null;
    } catch (error) {
      console.error(`Error getting flow ${path}:`, error);
      return null;
    }
  }

  async getAllFlows(): Promise<Flow[]> {
    const params = {
      Bucket: Resource.S3Bucket.name,
      Prefix: "flows/",
    };

    const response = await this.s3.listObjectsV2(params);

    const flows = await Promise.all(
      (response.Contents || []).map(async (content) => {
        if (!content.Key) return null;
        const flowName = content.Key.split("/")[1]?.split(".")[0];
        return flowName && (await this.getFlow(flowName));
      })
    );

    return flows.filter((flow): flow is Flow => !!flow);
  }
}
export default new S3Service();
