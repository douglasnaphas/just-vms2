import { App, Stack, StackProps, RemovalPolicy, CfnOutput } from "aws-cdk-lib";
import { aws_s3 as s3 } from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";

export interface AppStackProps extends StackProps {
  customProp?: string;
}
export class AppStack extends Stack {
  constructor(scope: App, id: string, props: AppStackProps = {}) {
    super(scope, id, props);
    const { customProp } = props;

    // Bucket
    const defaultBucketProps = {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    };
    const bucket = new s3.Bucket(this, "Bucket", {
      ...defaultBucketProps,
      versioned: true,
    });
    new CfnOutput(this, "BucketName", {
      value: bucket.bucketName,
    });

    // VPC
    const vpc = new ec2.Vpc(this, "TheVPC", {
      // 'IpAddresses' configures the IP range and size of the entire VPC.
      // The IP space will be divided based on configuration for the subnets.
      ipAddresses: ec2.IpAddresses.cidr("10.0.0.0/16"),
      maxAzs: 1,
      // 'subnetConfiguration' specifies the "subnet groups" to create.
      // Every subnet group will have a subnet for each AZ
      subnetConfiguration: [
        {
          // 'subnetType' controls Internet access, as described above.
          subnetType: ec2.SubnetType.PUBLIC,

          // 'name' is used to name this particular subnet group. You will have to
          // use the name for subnet selection if you have more than one subnet
          // group of the same type.
          name: "Public",

          // 'cidrMask' specifies the IP addresses in the range of of individual
          // subnets in the group. Each of the subnets in this group will contain
          // `2^(32 address bits - 24 subnet bits) - 2 reserved addresses = 254`
          // usable IP addresses.
          //
          // If 'cidrMask' is left out the available address space is evenly
          // divided across the remaining subnet groups.
          cidrMask: 24,
        },
        {
          cidrMask: 24,
          name: "PrivateWithEgress",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    // Instances
    const publicInstance = new ec2.BastionHostLinux(this, "PublicBastion", {
      vpc,
      machineImage: ec2.MachineImage.latestAmazonLinux(),
      instanceType: new ec2.InstanceType("t3.small"),
      subnetSelection: { subnetType: ec2.SubnetType.PUBLIC },
    });
    const privateInstanceWithEgress = new ec2.BastionHostLinux(
      this,
      "PrivateBastionWithEgress",
      {
        vpc,
        machineImage: ec2.MachineImage.latestAmazonLinux(),
        instanceType: new ec2.InstanceType("t3.small"),
        subnetSelection: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      }
    );
  }
}
