function PageWrapper(props) {
  // создаем переменную с классами card и классами из другого файла, которые нужны элементу, который будет обернут в Card
  const classes = 'page-wrapper ' + props.className;
  return <div className={classes}>{props.children}</div>;
}

export default PageWrapper;
