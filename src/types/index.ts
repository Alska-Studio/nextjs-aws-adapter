export type RequiredProps<T, K extends keyof T> = T & { [P in K]-?: T[P] };

export type DeepPartialExcept<T extends object, K extends NestedKeyOf<T>> = UnionToIntersection<PartialExceptUnion<T, K> | DeepPartial<T>>;

// --- Converts a union to an intersection (helper) ---
type UnionToIntersection<U> =
  (U extends U ? (arg: U) => void : never) extends ((arg: infer I) => void) ? I : never;

// --- Computes all possible dot-notation paths in an object ---
type PartialExceptUnion<T, K extends string> =
  K extends `${infer KFirst extends Extract<keyof T, string>}.${infer KRest extends string}`
    ? { [Key in KFirst]: Key extends keyof T ? PartialExceptUnion<T[Key], KRest> : never }
    : K extends keyof T ? { [Key in K]: NonNullable<T[Key]> } : never;

type DeepPartial<T> = T extends object ? {
  [P in keyof T]?: DeepPartial<T[P]>;
} : T;

type NestedKeyOf<T extends object> =
  { [P in keyof T & (string | number)]:
    Exclude<T[P], undefined> extends object
      ? `${P}` | `${P}.${NestedKeyOf<Exclude<T[P], undefined>>}`
      : `${P}`
  }[keyof T & (string | number)];

// --- Make everything deeply required ---
type DeepRequired<T> = T extends object ? {
  [P in keyof T]-?: DeepRequired<T[P]>;
} : T;

// --- Helper for partializing only specific nested paths ---
type RequiredExceptUnion<T, K extends string> =
  // Nested path: "a.b.c"
  K extends `${infer KFirst extends Extract<keyof T, string>}.${infer KRest extends string}`
    ? {
        [Key in keyof T]-?: Key extends KFirst
          ? T[Key] extends object | undefined
            ? RequiredExceptUnion<NonNullable<T[Key]>, KRest>
            : T[Key]
          : T[Key]
      }
    // Leaf path: shallow key
    : K extends keyof T
      ? { [Key in K]?: T[Key] } // exception: make optional
      : never;

// --- Final exported type ---
// Everything deeply required, EXCEPT the paths listed in K
export type DeepRequiredExcept<T extends object, K extends NestedKeyOf<T>> =
UnionToIntersection<RequiredExceptUnion<T, K> | DeepRequired<T>>;
