#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { ApiGatewayStack } from '../lib/api-gateway-stack';

const app = new cdk.App();
new ApiGatewayStack(app, 'example-secure-edge-rest');
