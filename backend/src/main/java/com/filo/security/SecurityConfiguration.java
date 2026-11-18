package com.filo.security;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.*;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.password.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.http.HttpStatus;

@Configuration
public class SecurityConfiguration {
 @Bean PasswordEncoder passwordEncoder(){return new BCryptPasswordEncoder(12);}
 @Bean UserDetailsService userDetails(AdminRepository users){
  return username->users.findByUsername(username).map(u->User.withUsername(u.username).password(u.passwordHash).roles("ADMIN").build()).orElseThrow(()->new UsernameNotFoundException("Credenciales inválidas"));
 }
 @Bean SecurityFilterChain security(HttpSecurity http)throws Exception{
  CookieCsrfTokenRepository csrfRepository=CookieCsrfTokenRepository.withHttpOnlyFalse();
  csrfRepository.setCookieName("FILO-XSRF-TOKEN");
  http.authorizeHttpRequests(a->a.requestMatchers("/api/csrf","/actuator/health").permitAll().anyRequest().hasRole("ADMIN"))
   .csrf(c->c.csrfTokenRepository(csrfRepository).csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler()))
   .exceptionHandling(e->e.authenticationEntryPoint((req,res,ex)->res.setStatus(401)).accessDeniedHandler((req,res,ex)->res.setStatus(403)))
   .formLogin(f->f.loginProcessingUrl("/api/login").successHandler((req,res,auth)->res.setStatus(204)).failureHandler((req,res,ex)->res.setStatus(401)).permitAll())
   .logout(l->l.logoutUrl("/api/logout").deleteCookies("FILO_SESSION").logoutSuccessHandler((req,res,auth)->res.setStatus(204)))
   .requestCache(c->c.disable())
   .addFilterBefore(new LoginRateLimitFilter(),org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter.class);
  return http.build();
 }
}
