# Build the Spring Boot application.
FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace

COPY backend/Gp3/.mvn/ .mvn/
COPY backend/Gp3/mvnw backend/Gp3/pom.xml ./
RUN chmod +x mvnw && ./mvnw -q -DskipTests dependency:go-offline

COPY backend/Gp3/src ./src
RUN ./mvnw -q -DskipTests package

# Run only the packaged application in the final image.
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /workspace/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
