#!/usr/bin/env python3
"""
Regenerate the Wag Watch architecture diagram.

Usage:
    pip install diagrams
    # macOS: brew install graphviz
    python3 docs/generate-architecture-diagram.py

Writes docs/architecture.png.
"""
from diagrams import Cluster, Diagram, Edge
from diagrams.aws.compute import Lambda
from diagrams.aws.database import Dynamodb
from diagrams.aws.ml import Bedrock
from diagrams.aws.network import APIGateway, CloudFront
from diagrams.aws.security import Cognito
from diagrams.aws.storage import S3
from diagrams.onprem.client import User

with Diagram(
    "Wag Watch — Architecture",
    filename="docs/architecture",
    outformat="png",
    show=False,
    direction="LR",
    graph_attr={"fontsize": "18", "bgcolor": "white", "pad": "0.5"},
):
    user = User("Caregiver\n(mobile browser)")

    with Cluster("AWS account"):
        cdn = CloudFront("CloudFront\n(HTTPS, SPA routing)")
        spa_bucket = S3("S3\n(React SPA)")
        cognito = Cognito("Cognito\n(JWT auth)")
        api = APIGateway("API Gateway\n(REST, throttled)")

        with Cluster("Lambda"):
            api_fn = Lambda("api-handler\n256 MB / 15 s")
            chat_fn = Lambda("chat-handler\n512 MB / 60 s")

        with Cluster("DynamoDB (PAY_PER_REQUEST, PITR)"):
            tables = Dynamodb("households · users · dogs\nevents · medications\nchat-sessions")

        photos = S3("S3\n(dog photos)")
        bedrock = Bedrock("Bedrock\n(Claude Haiku 4.5)")

    user >> Edge(label="HTTPS") >> cdn
    cdn >> spa_bucket
    user >> Edge(label="sign in") >> cognito
    user >> Edge(label="JWT") >> api
    api >> api_fn
    api >> chat_fn
    api_fn >> tables
    api_fn >> Edge(label="presigned URL") >> photos
    user >> Edge(style="dashed", label="PUT/GET photo\n(presigned)") >> photos
    chat_fn >> tables
    chat_fn >> bedrock
    api >> Edge(style="dashed", label="verify JWT") >> cognito
