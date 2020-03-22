import { expect as expectCDK, haveResource } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import Cdk = require('../lib/api-gateway-stack');

test('lambda with Rest API gateway Created', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new Cdk.ApiGatewayStack(app, 'example-secure-edge-rest-api')
    // THEN
    expectCDK(stack).to(haveResource("AWS::IAM::Role"))
    expectCDK(stack).to(haveResource("AWS::Lambda::Function"))
    expectCDK(stack).to(haveResource("AWS::ApiGateway::RestApi"))
    expectCDK(stack).to(haveResource("AWS::ApiGateway::UsagePlan"))
    expectCDK(stack).to(haveResource("AWS::ApiGateway::UsagePlanKey"))
    expectCDK(stack).to(haveResource("AWS::ApiGateway::ApiKey"))
});
