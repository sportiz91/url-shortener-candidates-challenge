# Refactor Candidates

After TDD cycle (once GREEN), look for:

- **Duplication** → Extract function/class
- **Long methods** → Break into private helpers (keep tests on public interface)
- **Shallow modules** → Combine or deepen
- **Feature envy** → Move logic to where data lives
- **Primitive obsession** → Introduce value objects
- **Existing code** the new code reveals as problematic

**Never refactor while RED.** Get to GREEN first, then improve with tests as your safety net.

---

## Duplication → Extract

Same shape repeated. Extract it so the rule lives in one place.

```typescript
// BAD: logic + magic numbers duplicated
const memberPrice = price - price * 0.2;
const earlyBirdPrice = price - price * 0.1;

// GOOD: one place to change the rule
const applyDiscount = (price: number, rate: number) => price - price * rate;
const memberPrice = applyDiscount(price, 0.2);
const earlyBirdPrice = applyDiscount(price, 0.1);
```

Rule of three: don't extract on the first repeat — wait until duplication is real, not imagined.

---

## Long methods → Private helpers

One function doing parse + validate + format is hard to read and test. Break it into
helpers; keep the public interface (and its tests) unchanged.

```typescript
// BAD: one function does everything
function processOrder(raw: string): Receipt {
  // ...split the string...
  // ...validate each item...
  // ...compute totals + tax...
  // ...format the receipt...   (40 lines)
}

// GOOD: public method stays the same; complexity moves to named helpers
function processOrder(raw: string): Receipt {
  const items = parseItems(raw);
  validate(items);
  return formatReceipt(total(items));
}
```

Tests still target `processOrder` (the behavior), not the helpers (the implementation).

---

## Shallow modules → Combine or deepen

A module is worth it when its interface hides MORE than it costs to learn.
**Deep** = small interface, lots hidden. **Shallow** = big interface, hides nothing.

```typescript
// BAD (shallow): using it costs more than doing it inline
class Adder {
  constructor(
    private a: number,
    private b: number,
  ) {}
  add(): number {
    return this.a + this.b;
  }
}
const total = new Adder(1, 2).add(); // ceremony for "1 + 2"

// GOOD (deep): tiny interface, hides real complexity
function formatMoney(cents: number, currency: string): string {
  // hides Intl, rounding, symbols, locales, edge cases...
  return new Intl.NumberFormat("es-AR", { style: "currency", currency }).format(
    cents / 100,
  );
}
```

Fix a shallow module by **combining** it into its caller (it wasn't earning its keep)
or **deepening** it (push more complexity behind the same simple interface).

---

## Feature envy → Move logic to its data

A function that touches another object's data more than its own wants to live inside
that object.

```typescript
// BAD: this function only ever uses Order's data
function calculateOrderTotal(order: Order): number {
  return order.items.reduce((sum, i) => sum + i.price * i.qty, 0);
}

// GOOD: logic lives where the data lives
class Order {
  constructor(public items: { price: number; qty: number }[]) {}
  total(): number {
    return this.items.reduce((sum, i) => sum + i.price * i.qty, 0);
  }
}
```

Red flag: chains like `customer.getAddress().getCity()` repeated in a function —
that function envies `Address`. Move the logic into `Address`.

---

## Primitive obsession → Value objects

Using raw `string`/`number` for domain concepts that have rules scatters validation
across the codebase. Wrap the primitive + its rules in a value object.

```typescript
// BAD: any string passes; validation repeated everywhere
function sendEmail(to: string) {
  /* ... */
}
if (!input.includes("@")) throw new Error("invalid"); // ...and again, and again

// GOOD: if you hold an Email, it is ALREADY valid
class Email {
  private constructor(public readonly value: string) {} // only door in
  static create(raw: string): Email {
    if (!raw.includes("@")) throw new Error(`Invalid email: ${raw}`);
    return new Email(raw);
  }
}
function sendEmail(to: Email) {
  /* no re-validation needed */
}
```

`private constructor` + `static create` guarantee no invalid instance can exist.
**Caveat:** overkill for small katas (YAGNI) — spotting the smell AND knowing when not
to apply it is the senior signal.

---

## Existing code the new code reveals

Not a named smell — an opportunity. New code (from a new test) often exposes old code as
too rigid or duplicated. Fix it during REFACTOR, while green.

```typescript
// EXISTING: fine when only credit cards existed
function pay(amount: number, cardNumber: string) {
  /* ... */
}

// New test adds PayPal → the hardcoded cardNumber is revealed as too rigid.
// GOOD: the new requirement reveals a missing abstraction
interface PaymentMethod {
  charge(amount: number): Promise<Receipt>;
}
function pay(amount: number, method: PaymentMethod) {
  return method.charge(amount);
}
```

Don't abstract speculatively. Wait until a real requirement reveals the problem, then
refactor with tests covering you.
