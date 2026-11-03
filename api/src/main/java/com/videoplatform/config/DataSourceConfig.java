package com.videoplatform.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;

import javax.sql.DataSource;
import java.net.URI;

@Configuration
@Profile("!dev")
public class DataSourceConfig {

    private static final Logger log = LoggerFactory.getLogger(DataSourceConfig.class);

    @Bean
    @Primary
    public DataSource dataSource(Environment env) {
        String databaseUrl = env.getProperty("DATABASE_URL");
        if (databaseUrl == null || databaseUrl.isBlank()) {
            databaseUrl = env.getProperty("DB_URL");
        }
        if (databaseUrl == null || databaseUrl.isBlank()) {
            databaseUrl = env.getProperty("spring.datasource.url");
        }

        HikariConfig config = new HikariConfig();

        if (databaseUrl != null && !databaseUrl.isBlank()) {
            String jdbcUrl;
            String username = env.getProperty("DB_USER", env.getProperty("spring.datasource.username"));
            String password = env.getProperty("DB_PASSWORD", env.getProperty("spring.datasource.password"));

            if (databaseUrl.startsWith("jdbc:")) {
                jdbcUrl = databaseUrl;
            } else {
                try {
                    // Normalize postgres:// or postgresql:// to parse host, port, db, credentials
                    String uriString = databaseUrl.replaceFirst("^postgres://", "http://").replaceFirst("^postgresql://", "http://");
                    URI uri = URI.create(uriString);

                    String host = uri.getHost();
                    int port = uri.getPort() > 0 ? uri.getPort() : 5432;
                    String path = uri.getPath(); // /dbname

                    if (uri.getUserInfo() != null) {
                        String[] parts = uri.getUserInfo().split(":", 2);
                        if (parts.length > 0 && (username == null || username.isBlank())) {
                            username = parts[0];
                        }
                        if (parts.length > 1 && (password == null || password.isBlank())) {
                            password = parts[1];
                        }
                    }

                    jdbcUrl = "jdbc:postgresql://" + host + ":" + port + path;
                } catch (Exception e) {
                    log.warn("Failed to parse URI from DATABASE_URL, using string replace", e);
                    if (databaseUrl.startsWith("postgres://")) {
                        jdbcUrl = databaseUrl.replaceFirst("^postgres://", "jdbc:postgresql://");
                    } else if (databaseUrl.startsWith("postgresql://")) {
                        jdbcUrl = "jdbc:" + databaseUrl;
                    } else {
                        jdbcUrl = "jdbc:postgresql://" + databaseUrl;
                    }
                }
            }

            log.info("Configuring PostgreSQL DataSource with JDBC URL: {}", jdbcUrl);
            config.setJdbcUrl(jdbcUrl);
            if (username != null) config.setUsername(username);
            if (password != null) config.setPassword(password);
            config.setDriverClassName("org.postgresql.Driver");
            return new HikariDataSource(config);
        }

        // Fallback to separate environment properties
        String host = env.getProperty("DB_HOST", "localhost");
        String port = env.getProperty("DB_PORT", "5432");
        String dbName = env.getProperty("DB_NAME", "videoplatform");
        String user = env.getProperty("DB_USER", "postgres");
        String pass = env.getProperty("DB_PASSWORD", "postgres");

        String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + "/" + dbName;
        log.info("Configuring PostgreSQL DataSource with fallback JDBC URL: {}", jdbcUrl);
        config.setJdbcUrl(jdbcUrl);
        config.setUsername(user);
        config.setPassword(pass);
        config.setDriverClassName("org.postgresql.Driver");
        return new HikariDataSource(config);
    }
}
