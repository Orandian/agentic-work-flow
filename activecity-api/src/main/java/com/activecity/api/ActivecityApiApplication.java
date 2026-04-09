package com.activecity.api;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan({
    "com.activecity.api.pub.repository",
    "com.activecity.api.admin.repository",
    "com.activecity.api.user.repository"
})
public class ActivecityApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(ActivecityApiApplication.class, args);
    }
}
