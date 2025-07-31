/**
 * Template literal function for Tailwind CSS classes
 * Does not perform any actual functionality, just returns a string
 * @param {TemplateStringsArray} strings - Template strings array
 */
export function tw(strings: TemplateStringsArray, ...values: any[]) {
  return strings.reduce(
    (result, string, i) => result + string + (values[i] || ""),
    ""
  );
}
export default tw;
