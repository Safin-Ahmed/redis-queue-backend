const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");

// Create a VPC
const vpc = new aws.ec2.Vpc("redis-vpc", {
  cidrBlock: "10.0.0.0/16",
  enableDnsHostnames: true,
  enableDnsSupport: true,
  tags: {
    Name: "redis-vpc",
  },
});

exports.vpcId = vpc.id;

// Create public subnets in three availability zones

const publicSubnet1 = new aws.ec2.Subnet("subnet-1", {
  vpcId: vpc.id,
  cidrBlock: "10.0.1.0/24",
  availabilityZone: "ap-southeast-1a",
  mapPublicIpOnLaunch: true,
  tags: {
    Name: "subnet-1",
  },
});

exports.publicSubnet1Id = publicSubnet1.id;

const publicSubnet2 = new aws.ec2.Subnet("subnet-2", {
  vpcId: vpc.id,
  cidrBlock: "10.0.2.0/24",
  availabilityZone: "ap-southeast-1b",
  mapPublicIpOnLaunch: true,
  tags: {
    Name: "subnet-2",
  },
});

exports.publicSubnet2Id = publicSubnet2.id;

const publicSubnet3 = new aws.ec2.Subnet("subnet-3", {
  vpcId: vpc.id,
  cidrBlock: "10.0.3.0/24",
  availabilityZone: "ap-southeast-1c",
  mapPublicIpOnLaunch: true,
  tags: {
    Name: "subnet-3",
  },
});

exports.publicSubnet3Id = publicSubnet3.id;

// Create an internet gateway
const internetGateway = new aws.ec2.InternetGateway("redis-igw", {
  vpcId: vpc.id,
  tags: {
    Name: "redis-igw",
  },
});

exports.igwId = internetGateway.id;

// Create a Route Table

const publicRouteTable = new aws.ec2.RouteTable("redis-rt", {
  vpcId: vpc.id,
  tags: {
    Name: "redis-rt",
  },
});

exports.publicRouteTableId = publicRouteTable.id;

const route = new aws.ec2.Route("igw-route", {
  routeTableId: publicRouteTable.id,
  destinationCidrBlock: "0.0.0.0/0",
  gatewayId: internetGateway.id,
});

exports.igwRouteId = route.id;

const rtAssociation1 = new aws.ec2.RouteTableAssociation("rt-association-1", {
  subnetId: publicSubnet1.id,
  routeTableId: publicRouteTable.id,
});

exports.rtAssociation1Id = rtAssociation1.id;

const rtAssociation2 = new aws.ec2.RouteTableAssociation("rt-association-2", {
  subnetId: publicSubnet2.id,
  routeTableId: publicRouteTable.id,
});

exports.rtAssociation2Id = rtAssociation2.id;

const rtAssociation3 = new aws.ec2.RouteTableAssociation("rt-association-3", {
  subnetId: publicSubnet3.id,
  routeTableId: publicRouteTable.id,
});

exports.rtAssociation3Id = rtAssociation3.id;

// Create a security group for the Node.js and Redis instances

const redisSecurityGroup = new aws.ec2.SecurityGroup("redis-secgroup", {
  vpcId: vpc.id,
  description: "Allow SSH, Redis and Node.js Traffic",
  ingress: [
    { protocol: "tcp", fromPort: 22, toPort: 22, cidrBlocks: ["0.0.0.0/0"] },
    {
      protocol: "tcp",
      fromPort: 6379,
      toPort: 6379,
      cidrBlocks: ["10.0.0.0/16"],
    },
    {
      protocol: "tcp",
      fromPort: 16379,
      toPort: 16379,
      cidrBlocks: ["10.0.0.0/16"],
    },
    {
      protocol: "tcp",
      fromPort: 4000,
      toPort: 4000,
      cidrBlocks: ["0.0.0.0/0"],
    },
  ],
  egress: [
    { protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] },
  ],
  tags: {
    Name: "redis-secgroup",
  },
});

exports.redisSecurityGroupId = redisSecurityGroup.id;

// Security Group For Frontend
const frontendSecurityGroup = new aws.ec2.SecurityGroup("frontend-secgroup", {
  vpcId: vpc.id,
  description: "Allow HTTP Traffic For the Frontend",
  ingress: [
    { protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] },
    { protocol: "tcp", fromPort: 22, toPort: 22, cidrBlocks: ["0.0.0.0/0"] },
  ],
  egress: [
    { protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] },
  ],
});

exports.frontendSecurityGroupId = frontendSecurityGroup.id;

const amiId = "ami-01811d4912b4ccb26";

// Create a Node.js instance in the first subnet (ap-southeast-1a)

const nodejsInstance = new aws.ec2.Instance("nodejs-instance", {
  instanceType: "t2.micro",
  vpcSecurityGroupIds: [redisSecurityGroup.id],
  ami: amiId,
  subnetId: publicSubnet1.id,
  keyName: "MyKeyPair",
  associatePublicIpAddress: true,
  tags: {
    Name: "nodejs-instance",
    Environment: "Development",
    Project: "Redis Job Queue",
  },
});

exports.nodejsInstanceId = nodejsInstance.id;

exports.nodejsInstancePublicIp = nodejsInstance.publicIp;

// Helper function to create Redis instance

const createRedisInstance = (name, subnetId) => {
  return new aws.ec2.Instance(name, {
    instanceType: "t2.micro",
    vpcSecurityGroupIds: [redisSecurityGroup.id],
    ami: amiId,
    subnetId,
    keyName: "MyKeyPair",
    associatePublicIpAddress: true,
    tags: {
      Name: name,
      Environment: "Development",
      Project: "Redis-Setup",
    },
  });
};

const redisInstance1 = createRedisInstance(
  "redis-instance-1",
  publicSubnet2.id
);

exports.redisInstance1Id = redisInstance1.id;

const redisInstance2 = createRedisInstance(
  "redis-instance-2",
  publicSubnet3.id
);
exports.redisInstance2Id = redisInstance2.id;

const redisInstance3 = createRedisInstance(
  "redis-instance-3",
  publicSubnet2.id
);
exports.redisInstance3Id = redisInstance3.id;

const redisInstance4 = createRedisInstance(
  "redis-instance-4",
  publicSubnet3.id
);
exports.redisInstance4Id = redisInstance4.id;

const redisInstance5 = createRedisInstance(
  "redis-instance-5",
  publicSubnet2.id
);
exports.redisInstance5Id = redisInstance5.id;

const redisInstance6 = createRedisInstance(
  "redis-instance-6",
  publicSubnet3.id
);
exports.redisInstance6Id = redisInstance6.id;

const redisEndpoint = `http:${redisInstance6.publicIp}:16379`;

const workerLaunchTemplate = new aws.ec2.LaunchTemplate(
  "worker-launch-template",
  {
    instanceType: "t2.micro",
    imageId: amiId,
    keyName: "MyKeyPair",
    vpcSecurityGroupIds: [redisSecurityGroup.id],
    userData: pulumi.secret(
      Buffer.from(
        `

                #!/bin/bash

                sudo apt update -y
                sudo apt install -y git nodejs npm
                cd /home/ubuntu
                git clone https://github.com/Safin-Ahmed/redis-queue-backend.git
                cd redis-queue-backend
                npm install
                export REDIS_HOST=${redisEndpoint}
                export REDIS_PORT=6379
                node worker.js
            
            `
      ).toString("base64")
    ),
    tags: {
      Name: "Worker-Template",
    },
  }
);

exports.workerLaunchTemplateId = workerLaunchTemplate.id;

// Auto Scaling Group For Workers

const workerAutoScalingGroup = new aws.autoscaling.Group("worker-asg", {
  desiredCapacity: 2,
  maxSize: 10,
  minSize: 1,
  vpcZoneIdentifiers: [publicSubnet1.id, publicSubnet2.id, publicSubnet3.id],
  launchTemplate: {
    id: workerLaunchTemplate.id,
    version: "$Latest",
  },
  tags: [
    {
      key: "AutoScaleGroup",
      value: "WorkerInstance",
      propagateAtLaunch: true,
    },
  ],
});

exports.workerAutoScalingGroupId = workerAutoScalingGroup.id;

// Monitoring Instance for Auto scaling worker
const monitoringInstance = new aws.ec2.Instance("monitoring-instance", {
  instanceType: "t2.micro",
  vpcSecurityGroupIds: [redisSecurityGroup.id],
  ami: amiId,
  subnetId: publicSubnet1.id,
  keyName: "MyKeyPair",
  associatePublicIpAddress: true,
  userData: `#!/bin/bash 
    
        sudo apt update -y
        sudo apt install -y nodejs npm awscli git
        cd /home/ubuntu
        git clone https://github.com/Safin-Ahmed/redis-queue-backend.git
        npm install
        node monitor.js
    `,
  tags: {
    Name: "monitoring-instance",
    Environment: "Development",
    Project: "Redis Job Queue",
  },
});

exports.monitoringInstanceId = monitoringInstance.id;

const grafanaInstance = new aws.ec2.Instance("grafana-instance", {
  instanceType: "t2.micro",
  vpcSecurityGroupIds: [redisSecurityGroup.id],
  ami: amiId,
  subnetId: publicSubnet1.id,
  keyName: "MyKeyPair",
  associatePublicIpAddress: true,
  tags: {
    Name: "grafana-instance",
    Environment: "Development",
    Project: "Redis Job Queue",
  },
});

exports.grafanaInstanceId = grafanaInstance.id;

const frontendInstance = new aws.ec2.Instance("frontend-instance", {
  instanceType: "t2.micro",
  vpcSecurityGroupIds: [frontendSecurityGroup.id],
  ami: amiId,
  subnetId: publicSubnet1.id,
  keyName: "MyKeyPair",
  associatePublicIpAddress: true,
  tags: {
    Name: "grafana-instance",
    Environment: "Development",
    Project: "Redis Job Queue",
  },
  userData: `#!/bin/bash

        sudo apt update -y
        sudo apt install -y git nodejs npm nginx

        cd /home/ubuntu
        git clone https://github.com/Safin-Ahmed/redis-queue-frontend.git

        cd redis-job-frontend

        npm install

        npm run build

        sudo mv /home/ubuntu/vite-react-frontend/dist /var/www/html
        sudo systemctl restart nginx
    `,
});

exports.frontendInstanceId = frontendInstance.id;
