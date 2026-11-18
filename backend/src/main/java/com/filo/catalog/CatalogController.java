package com.filo.catalog;
import com.filo.common.DomainException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api") @Transactional
public class CatalogController {
 private final ClientRepository clients;private final BarberRepository barbers;private final ServiceRepository services;
 public CatalogController(ClientRepository c,BarberRepository b,ServiceRepository s){clients=c;barbers=b;services=s;}
 public record ClientInput(Long version,@NotBlank @Size(max=80) String name,@NotNull @Size(max=32) String phone,@NotNull @Size(max=500) String notes,boolean active){}
 public record BarberInput(Long version,@NotBlank @Size(max=80) String name,boolean active){}
 public record ServiceInput(Long version,@NotBlank @Size(max=80) String name,@Min(15) @Max(240) int duration,@NotNull @DecimalMin("0") @DecimalMax("9999999999.99") @Digits(integer=10,fraction=2) BigDecimal price,boolean active){}
 public record ClientView(Long id,Long version,String name,String phone,String notes,boolean active){}
 public record BarberView(Long id,Long version,String name,boolean active){}
 public record ServiceView(Long id,Long version,String name,int duration,BigDecimal price,boolean active){}
 static ClientView view(Client c){return new ClientView(c.id,c.version,c.name,c.phone,c.notes,c.active);}
 static BarberView view(Barber b){return new BarberView(b.id,b.version,b.name,b.active);}
 static ServiceView view(ServiceOffering s){return new ServiceView(s.id,s.version,s.name,s.duration,s.price,s.active);}
 @GetMapping("/clients") public List<ClientView> clients(){return clients.findAll().stream().sorted(Comparator.comparing(c->c.name)).map(CatalogController::view).toList();}
 @GetMapping("/barbers") public List<BarberView> barbers(){return barbers.findAll().stream().sorted(Comparator.comparing(b->b.name)).map(CatalogController::view).toList();}
 @GetMapping("/services") public List<ServiceView> services(){return services.findAll().stream().sorted(Comparator.comparing(s->s.name)).map(CatalogController::view).toList();}
 @PostMapping("/clients") public ClientView createClient(@Valid @RequestBody ClientInput i){return saveClient(new Client(),i);}
 @PutMapping("/clients/{id}") public ClientView updateClient(@PathVariable Long id,@Valid @RequestBody ClientInput i){Client c=clients.findById(id).orElseThrow(()->missing());version(c.version,i.version);return saveClient(c,i);}
 @PostMapping("/barbers") public BarberView createBarber(@Valid @RequestBody BarberInput i){return saveBarber(new Barber(),i);}
 @PutMapping("/barbers/{id}") public BarberView updateBarber(@PathVariable Long id,@Valid @RequestBody BarberInput i){Barber b=barbers.findById(id).orElseThrow(()->missing());version(b.version,i.version);return saveBarber(b,i);}
 @PostMapping("/services") public ServiceView createService(@Valid @RequestBody ServiceInput i){return saveService(new ServiceOffering(),i);}
 @PutMapping("/services/{id}") public ServiceView updateService(@PathVariable Long id,@Valid @RequestBody ServiceInput i){ServiceOffering s=services.findById(id).orElseThrow(()->missing());version(s.version,i.version);return saveService(s,i);}
 ClientView saveClient(Client c,ClientInput i){c.name=i.name.strip();c.phone=i.phone.strip();c.notes=i.notes.strip();c.active=i.active;return view(clients.saveAndFlush(c));}
 BarberView saveBarber(Barber b,BarberInput i){b.name=i.name.strip();b.active=i.active;return view(barbers.saveAndFlush(b));}
 ServiceView saveService(ServiceOffering s,ServiceInput i){
  if(i.duration%5!=0)throw new DomainException(400,"La duración debe ser múltiplo de 5 minutos.");
  s.name=i.name.strip();s.duration=i.duration;s.price=i.price;s.active=i.active;return view(services.saveAndFlush(s));
 }
 public static void version(Long actual,Long expected){if(expected==null||!expected.equals(actual))throw new DomainException(409,"El registro cambió. Recargá antes de guardar.");}
 static DomainException missing(){return new DomainException(404,"No encontramos el registro.");}
}
