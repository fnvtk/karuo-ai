{__NOLAYOUT__}<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>跳转提示</title>
    <style type="text/css">
        body {
            background-color: #fff;
            font-family: "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif;
            font-size: 14px;
            line-height: 20px;
            color: #333333;
            margin: 0;
            padding: 0;
        }
        .system-message {
            padding: 24px 48px;
            margin: 100px auto;
            max-width: 600px;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .system-message h1 {
            font-size: 36px;
            line-height: 40px;
            margin-bottom: 12px;
            font-weight: 200;
            text-align: center;
        }
        .system-message .success, .system-message .error {
            line-height: 1.8em;
            font-size: 16px;
            text-align: center;
        }
        .system-message .detail {
            font-size: 12px;
            line-height: 20px;
            margin-top: 12px;
            text-align: center;
        }
        .system-message .jump {
            text-align: center;
            padding-top: 10px;
        }
        .system-message .success {
            color: #27ae60;
        }
        .system-message .error {
            color: #e74c3c;
        }
        .system-message .jump a {
            color: #333;
            text-decoration: none;
        }
        .system-message .jump a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="system-message">
        <?php switch ($code) {?>
            <?php case 1:?>
            <h1>:)</h1>
            <p class="success"><?php echo(strip_tags($msg));?></p>
            <?php break;?>
            <?php case 0:?>
            <h1>:(</h1>
            <p class="error"><?php echo(strip_tags($msg));?></p>
            <?php break;?>
        <?php } ?>
        <p class="detail"></p>
        <p class="jump">
            页面自动 <a id="href" href="<?php echo($url);?>">跳转</a> 等待时间： <b id="wait"><?php echo($wait);?></b>
        </p>
    </div>
    <script type="text/javascript">
        (function(){
            var wait = document.getElementById('wait'),
                href = document.getElementById('href').href;
            var interval = setInterval(function(){
                var time = --wait.innerHTML;
                if(time <= 0) {
                    location.href = href;
                    clearInterval(interval);
                }
            }, 1000);
        })();
    </script>
</body>
</html> 