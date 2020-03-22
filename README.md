# CDK TypeScript project to generate CloudFormation yaml files

The `cdk.json` file tells the CDK Toolkit how to execute the app.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template

 ## To generate cdk-cfn.yaml

 `stack=<your-app-name> npm run synth`

 that will create `cdk-cfn.yaml` file in `/<your-project-name>/cdk-cfn.yaml`

 for example 

 `stack=example-secure-edge-rest-api npm run synth`
