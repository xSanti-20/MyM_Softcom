# Imagen base para compilar
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app

# Copiar csproj y restaurar dependencias
COPY ["API_PESO_PIG.csproj", "."]
RUN dotnet restore

# Copiar el resto del código y compilar
COPY . .
RUN dotnet publish -c Release -o out

# Imagen base para ejecutar la app
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/out .

# Puerto que se expone
EXPOSE 80

# Comando para iniciar la app
ENTRYPOINT ["dotnet", "API_PESO_PIG.dll"]