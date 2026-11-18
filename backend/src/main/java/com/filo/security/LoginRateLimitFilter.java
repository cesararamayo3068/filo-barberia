package com.filo.security;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.time.*;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.web.filter.OncePerRequestFilter;
public class LoginRateLimitFilter extends OncePerRequestFilter {
 private record Window(long since,int count){}
 private final ConcurrentHashMap<String,Window> attempts=new ConcurrentHashMap<>();
 @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain)throws ServletException,IOException{
  if("POST".equals(req.getMethod())&&req.getServletPath().equals("/api/login")){
   long now=System.currentTimeMillis();
   attempts.entrySet().removeIf(e->now-e.getValue().since>60000);
   if(attempts.size()>10000){res.setStatus(429);res.setHeader("Retry-After","60");return;}
   Window w=attempts.compute(req.getRemoteAddr(),(k,v)->v==null||now-v.since>60000?new Window(now,1):new Window(v.since,v.count+1));
   if(w.count>10){res.setStatus(429);res.setHeader("Retry-After","60");return;}
  }
  chain.doFilter(req,res);
 }
}
