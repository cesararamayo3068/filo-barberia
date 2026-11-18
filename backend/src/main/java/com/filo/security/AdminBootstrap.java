package com.filo.security;
import org.springframework.boot.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
@Component
public class AdminBootstrap implements ApplicationRunner {
 private final AdminRepository users;private final PasswordEncoder encoder;private final String username,password;
 public AdminBootstrap(AdminRepository u,PasswordEncoder e,@Value("${filo.admin-username}")String name,@Value("${filo.admin-password}")String pass){users=u;encoder=e;username=name;password=pass;}
 @Override @Transactional public void run(ApplicationArguments args){
  if(users.count()>0)return;
  if(username==null||!username.matches("[A-Za-z0-9._-]{3,100}")||password==null||password.length()<16||password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length>72)
   throw new IllegalStateException("Configurá ADMIN_USERNAME y ADMIN_PASSWORD (16 a 72 bytes) para crear el primer administrador.");
  AdminUser user=new AdminUser();user.username=username;user.passwordHash=encoder.encode(password);users.save(user);
 }
}
