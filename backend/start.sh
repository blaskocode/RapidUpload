#!/bin/bash

# Set Java 17 environment
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"

# Set Java memory options for handling large batch uploads
# -Xms512m: Initial heap size
# -Xmx2048m: Maximum heap size (2GB)
export MAVEN_OPTS="-Xms512m -Xmx2048m"

# Start Spring Boot application
./mvnw spring-boot:run

