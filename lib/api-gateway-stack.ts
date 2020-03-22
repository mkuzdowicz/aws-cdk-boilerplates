import * as cdk from '@aws-cdk/core';
import * as apigateway from '@aws-cdk/aws-apigateway'
import { Code } from '@aws-cdk/aws-lambda'
import * as lambda from '@aws-cdk/aws-lambda'
import * as iam from '@aws-cdk/aws-iam'
import { Duration, Tag, Fn } from '@aws-cdk/core'
import * as s3 from '@aws-cdk/aws-s3'
import { ApiKeySourceType } from '@aws-cdk/aws-apigateway';
import { Effect, AnyPrincipal } from '@aws-cdk/aws-iam';

export class ApiGatewayStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const context = cdk.Stack.of(this)
    const account = context.account
    const region = context.region

    const envParameter = new cdk.CfnParameter(this, 'envParameter', {
      type: 'String',
      description: 'envParameter',
    })

    const allWhitelistedIps = new cdk.CfnParameter(this, 'allWhitelistedIps', {
      type: 'String',
      description: 'allWhitelistedIps',
    })

    const appName = 'example-secure-edge-rest'
    const deployBucket = s3.Bucket.fromBucketName(
      this,
      'deployBucket',
      'support-service-lambdas-dist',
    )

    // role
    const createLambdaRole = () => {
      const role = new iam.Role(this, 'lambdaRole', {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
      })

      role.addToPolicy(new iam.PolicyStatement({
        actions: ['ssm:GetParametersByPath'],
        resources: [`arn:aws:ssm:${region}:${account}:parameter/${envParameter.valueAsString}/${appName}`],
      }))

      role.addToPolicy(new iam.PolicyStatement({
        actions: ['kms:Decrypt'],
        resources: [`arn:aws:kms:${region}:${account}:alias/aws/ssm`],
      }))

      role.addToPolicy(new iam.PolicyStatement({
        actions: ['logs:CreateLogGroup'],
        resources: [`arn:aws:logs:${region}:${account}:*`],
      }))

      role.addToPolicy(new iam.PolicyStatement({
        actions: [
          'logs:CreateLogStream',
          'logs:PutLogEvents'
        ],
        resources: [`arn:aws:logs:${region}:${account}:log-group:/aws/lambda/${appName}-${envParameter.valueAsString}:*`],
      }))

      Tag.add(role, 'App', appName)
      Tag.add(role, 'Env', envParameter.valueAsString)

      return role
    }

    // Lambda
    const createLambda = (fnRole: iam.IRole) => {
      const fn = new lambda.Function(
        this,
        'lambda',
        {
          functionName: `${appName}-${envParameter.valueAsString}`,
          runtime: lambda.Runtime.JAVA_8,
          memorySize: 1536,
          timeout: Duration.seconds(300),
          code: Code.bucket(
            deployBucket,
            `${envParameter.valueAsString}/example-secure-edge-rest'/example-secure-edge-rest'.jar`
          ),
          handler: 'com.mkuzdowicz.api.Handler::handle',
          role: fnRole,
          environment: {
            'App': appName,
            'Env': envParameter.valueAsString,
          }
        },
      )

      Tag.add(fn, 'App', appName)
      Tag.add(fn, 'Env', envParameter.valueAsString)

      return fn
    }

    // api gateway
    const createApi = (fn: lambda.IFunction) => {
      const apiStageName: string = context.resolve(envParameter.valueAsString)

      const apiResourcePolicy = new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            actions: ['execute-api:Invoke'],
            principals: [new AnyPrincipal()],
            resources: ['execute-api:/*/*/*'],
          }),
          new iam.PolicyStatement({
            effect: Effect.DENY,
            principals: [new AnyPrincipal()],
            actions: ['execute-api:Invoke'],
            resources: ['execute-api:/*/*/*'],
            conditions: {
              'NotIpAddress': {
                "aws:SourceIp": allWhitelistedIps
              }
            }
          })
        ]
      })

      const api = new apigateway.LambdaRestApi(
        this,
        appName,
        {
          restApiName: `${appName}-${envParameter.valueAsString}`,
          proxy: false,
          apiKeySourceType: ApiKeySourceType.HEADER,
          handler: fn,
          description: `API in ${envParameter.valueAsString} env`,
          deployOptions: {
            stageName: apiStageName,
          },
          policy: apiResourcePolicy,
        })

      api.root.addMethod('ANY', new apigateway.LambdaIntegration(fn), { apiKeyRequired: true })
      api.root.addProxy({ defaultMethodOptions: { apiKeyRequired: true } })

      Tag.add(api, 'App', appName)
      Tag.add(api, 'Env', envParameter.valueAsString)

      const apiKey = new apigateway.ApiKey(
        this,
        'apiKey',
        {
          apiKeyName: `${appName}-key-${envParameter.valueAsString}`,
          resources: [api]
        }
      )

      const usagePlan = new apigateway.UsagePlan(
        this,
        'apiUsagePlan', {
        name: `${appName}-usage-plan-${envParameter.valueAsString}`,
        apiKey: apiKey,
      })

      usagePlan.addApiStage({
        stage: api.deploymentStage,
      })

      return api
    }

    createApi(
      createLambda(
        createLambdaRole()
        )
      )
  }
}
