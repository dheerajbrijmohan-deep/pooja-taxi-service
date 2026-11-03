// Employee photo (served through the signed-in API) or initials when there is none.
export default function Avatar({ name, photoId, size = 56, src }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
  const style = { width: size, height: size, fontSize: size * 0.36 };
  return photoId || src ? (
    <img src={src ?? `/api/employees/documents/${photoId}`} alt="" style={style} className="rounded-full object-cover shrink-0 bg-muted" />
  ) : (
    <div style={style} className="rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center shrink-0">{initials || "?"}</div>
  );
}
