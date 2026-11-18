package com.filo.security;
import jakarta.persistence.*;
@Entity @Table(name="admin_user")
public class AdminUser {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
 @Column(nullable=false,unique=true,length=100) public String username;
 @Column(name="password_hash",nullable=false,length=100) public String passwordHash;
}
